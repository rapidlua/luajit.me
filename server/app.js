const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const { runLuaCode } = require('./runner');
const { targets } = require('./targets');

const app = express();
const jsonParser = bodyParser.json({ type: '*/*' });
const textParser = bodyParser.text({ type: '*/*' });

const TIMEOUT = +process.env['TIMEOUT'] || 200;
const CONCURRENCY = +process.env['CONCURRENCY'] || 1;
const JOBS_MAX = +process.env['JOBS_MAX'] || (3000/TIMEOUT)*CONCURRENCY;
const GA_MEASUREMENT_ID = process.env['GA_MEASUREMENT_ID'] || '';

app.set('etag', false);

const runQueue = new require('async-limiter')({ concurrency: CONCURRENCY });
app.post('/run', jsonParser, function(req, res) {

    if (typeof req.body.text !== 'string' || typeof req.body.target != 'object'
        || !targets[req.body.target.id]
    )
        return res.status(400).send('Bad request');

    if (runQueue.length > JOBS_MAX)
        return res.status(500).send('Too many requests');

    // Safari quirk: replaces spaces with non-breaking spaces
    // in a textarea with white-space: nowrap style
    const source = req.body.text.replace(/\xa0/g, ' ');

    function socketOnClose() {
        runQueue.splice(runQueue.jobs.indexOf(doRun), 1);
        res.send();
    }

    res.socket.addListener('close', socketOnClose);

    function doRun(onJobDone) {
        res.socket.removeListener('close', socketOnClose);
        runLuaCode(
            source, { timeout: TIMEOUT, target: req.body.target.id },
            function(error, result) {
                if (error) {
                    res.status(500).send(error.message);
                } else {
                    res.set('Content-Type', 'application/json');
                    res.send(result);
                }
                onJobDone();
            }
        );
    }

    runQueue.push(doRun);
});

app.get('/stat', (req, res) => res.json({ jobs: runQueue.length, jobsMax }));

app.use('/static', express.static(__dirname + '/public/static'));

app.use('/', function (req, res) {
    let responseData = fs.readFileSync(__dirname + '/public/index.html');
    if (GA_MEASUREMENT_ID) {
        responseData = responseData.toString('utf-8').replace(
            '</head>',
            '<script async src="https://www.googletagmanager.com/gtag/js?id='
            + GA_MEASUREMENT_ID + '"></script>'
            + '<script>'
            + 'window.dataLayer=window.dataLayer||[];'
            + 'function gtag(){dataLayer.push(arguments)}'
            + "gtag('js',new Date());gtag('config','" + GA_MEASUREMENT_ID + "')"
            + '</script></head>'
        );
    }
    res.set('Content-Type', 'text/html');
    res.send(responseData);
});

app.listen(8000, function () {
  console.log('LuaJIT WebInspector listening on port 8000');
});
