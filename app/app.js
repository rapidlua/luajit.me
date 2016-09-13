const express = require('express');
const bodyParser = require('body-parser');
const stream = require('stream')
const child_process = require('child_process')

const app = express();
const jsonParser = bodyParser.json({ type: '*/*' });

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
        return res.status(500).send('{"error": "Too many requests"}\n')
    num_jobs = num_jobs + 1
    const source = req.body.source
    if (typeof source != 'string')
        return res.status(400).send('{"error": "Bad request"}\n')
    // run code in a new helper process
    var helper = child_process.spawn(helper_cmd, helper_args, helper_opts)
    var watchdog = setTimeout(function() {
        helper.kill();
        res.send('{"error": "Timeout exceeded"}\n')
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
    meta_pipe.on('end', () => res && res.status(200).send(response))
})

app.use('/', express.static(__dirname + '/public'));

app.listen(3000, function () {
  console.log('LuaJIT WebInspector listening on port 3000');
});
