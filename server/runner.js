const child_process = require('child_process');

function runLuaCode(code, options, callback) {
    // run code in a new helper process
    const meta_fd = 20;
    const stdio = new Array(meta_fd).fill(null);
    stdio[0] = 'pipe';
    stdio[1] = 'ignore';
    stdio[2] = process.stderr;
    stdio[meta_fd] = 'pipe';
    const luajit = child_process.spawn(
        'luajit', [__dirname + '/instrument.lua', meta_fd], { stdio }
    );
    let error = null;
    const watchdog = setTimeout(function(){
        luajit.kill('SIGKILL');
        error = new Error('Timeout exceeded');
    }, options.timeout);
    luajit.on('error', function(e) {
        clearTimeout(watchdog);
        error = e;
    });
    luajit.on('exit', function(code, signal) {
        clearTimeout(watchdog);
        if (signal || code!==0)
            error = error || new Error('Abnormal termination');
    });
    const meta_pipe = luajit.stdio[meta_fd];
    const result = [];
    meta_pipe.on('data', buf => result.push(buf));
    meta_pipe.on('end', function() {
        callback(error, Buffer.concat(result))
    });
    luajit.stdin.end(code);
}

module.exports = { runLuaCode };
