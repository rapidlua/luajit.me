const express = require('express');
const bodyParser = require('body-parser');
const stream = require('stream')
const child_process = require('child_process')
const fs = require('fs');
const async = require('async');
const tmp = require('tmp');
const xml2json = require('xml2json');

const app = express();
const jsonParser = bodyParser.json({ type: '*/*' });
const textParser = bodyParser.text({ type: '*/*' });

const helper_timeout = 200
const helper_limit = 50
const helper_cmd = '/usr/bin/luajit'
const helper_meta_fd = 20
const helper_opts = {stdio: [
    'pipe', 'ignore', process.stderr,
    null, null, null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, 'pipe']}
const helper_args = [__dirname + '/instrument.lua', ''+helper_meta_fd]

var num_jobs = 0
app.get('/stat', (req, res) => res.send(
    '{"jobs": '+num_jobs+', "capacity": '+helper_limit+'}\n'
))

app.post('/run', jsonParser, function(req, res) {
    if (num_jobs > helper_limit)
        return res.status(500).send('Too many requests')
    num_jobs = num_jobs + 1
    const source = req.body.source
    if (typeof source != 'string')
        return res.status(400).send('Bad request')
    // run code in a new helper process
    var helper = child_process.spawn(helper_cmd, helper_args, helper_opts)
    var watchdog = setTimeout(function() {
        helper.kill();
        res.status(500).send("Timeout exceeded")
        res = null
    }, helper_timeout)
    helper.on('error', function(err) {
        console.error(err)
        res.status(500).send(err)
        res = null
    })
    helper.on('exit', function(){
        num_jobs = num_jobs - 1;
        clearTimeout(watchdog)
    })
    helper.stdin.write(source)
    helper.stdin.end()
    var meta_pipe = helper.stdio[helper_meta_fd];
    var response = ''
    meta_pipe.on('data', (buf) => response += buf)
    meta_pipe.on('end', () => res && res.send(response))
})

app.use('/', express.static(__dirname + '/public'));

const snippetsDir = __dirname + '/snippets';

app.get('/snippets', (req, res) => {
    fs.readdir(snippetsDir, (err, files) => {
        if (err)
            return res.status(500).send(err);
        var tasks = files.filter((name)=>(name.match(/[.]lua$/))).map((name) => (
            (callback) => {
                fs.readFile(snippetsDir+"/"+name, (err, data) => {
                    callback(err, {
                        label: name.match(/(.*)[.]lua/)[1],
                        code: data+""
                    });
                });
            }
        ));
        async.parallel(tasks, (err, results) => {
            if (err)
                return res.status(500).send(err);
            res.send(JSON.stringify({
                snippets: results
            }));
        })
    });
})

const graphviz_dot_cmd = '/usr/bin/dot';
app.post('/renderdot', textParser, function(req, res) {
    tmp.file((error, temporaryPath, temporaryFd, temporaryCleanup) => {
        if (error)
            return res.status(500).send(error);
        fs.writeSync(temporaryFd, req.body);
        child_process.execFile(
            graphviz_dot_cmd,
            ['-Tsvg', temporaryPath],
            (error, stdout, stderr) => {
                temporaryCleanup();
                if (error)
                    return res.status(500).send(stderr);
                res.send(xml2json.toJson(stdout));
            }
        );
    });
})

app.listen(3000, function () {
  console.log('LuaJIT WebInspector listening on port 3000');
});
