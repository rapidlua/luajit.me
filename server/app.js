const express = require('express');
const bodyParser = require('body-parser');
const { runLuaCode } = require('./runner');

const app = express();
const jsonParser = bodyParser.json({ type: '*/*' });
const textParser = bodyParser.text({ type: '*/*' });

const timeout = +process.env['TIMEOUT'] || 200;
const concurrency = +process.env['CONCURRENCY'] || 1;
const jobsMax = +process.env['JOBS_MAX'] || (3000/timeout)*concurrency;

const runQueue = new require('async-limiter')({ concurrency });

app.post('/run', jsonParser, function(req, res) {

    if (typeof req.body.source !== 'string')
        return res.status(400).send('Bad request');

    // Safari quirk: replaces spaces with non-breaking spaces
    // in a textarea with white-space: nowrap style
    const source = req.body.source.replace(/\xa0/g, ' ');

    if (runQueue.length > jobsMax)
        return res.status(500).send('Too many requests');

    function socketOnClose() {
        runQueue.splice(runQueue.jobs.indexOf(doRun), 1);
        res.send();
    }

    res.socket.addListener('close', socketOnClose);

    function doRun(onJobDone) {
        res.socket.removeListener('close', socketOnClose);
        runLuaCode(
            source, { timeout, target: req.body.target },
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

app.use('/', express.static(__dirname + '/public'));

app.listen(8000, function () {
  console.log('LuaJIT WebInspector listening on port 8000');
});
