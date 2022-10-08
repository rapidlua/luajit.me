const fs = require('fs');
const child_process = require('child_process');

function TmpFile(data) {
    function randomName() {
        for (;;) {
            const name = Math.random().toString(36).substr(2, 8);
            if (name.length >= 8) return name;
        }
    }
    for (;;) {
        const path = '/tmp/' + randomName();
        try {
            const fd = fs.openSync(
                path, fs.constants.O_RDWR
                | fs.constants.O_CREAT | fs.constants.O_EXCL);
            if (data) fs.writeSync(fd, data, 0, data.length, 0);
            this.path = path;
            this.fd = fd;
            this.destroy = function() {
                fs.closeSync(fd);
                fs.unlinkSync(path);
            }
            return;
        } catch (e) {
            if (e.code !== 'EEXIST') throw e;
        }
    }
}

function runInSandbox(options, callback) {
    const sandals = child_process.spawn(
        '/bin/sandals', [], { stdio: ['pipe', 'pipe', process.stderr] });
    const responseChunks = [];
    sandals.stdin.end(JSON.stringify(options));
    sandals.stdout.on('data', buf => responseChunks.push(buf));
    sandals.stdout.on('end', function() {
        try {
            const response = JSON.parse(
                Buffer.concat(responseChunks).toString('utf8'));
            switch (response.status) {
            case 'internalError':
            case 'requestInvalid':
                callback(new Error(response.description));
                break;
            case 'timeLimit':
                callback(new Error('Timeout exceeded'));
                break;
            default:
                callback(null, response);
                break;
            }
        } catch (e) {
            callback(e);
        }
    });
}

function massage(output) {
    // JSON coming out of Lua has keys ordered arbitrary which hurts
    // readability.  ES6 requires object keys to be enumerated in
    // assignment order, but Node is not quite ES6.
    //
    // Still, it helps a lot.
    const result = Object.assign({
        type: undefined,
        description: undefined,
        objects: undefined
    }, output);
    result.objects = output.objects.map((object) => {
        switch (object.type) {
        case "file":
            return Object.assign({
                type: undefined,
                name: undefined
            }, object);
        case "prototype":
            return Object.assign({
                type: undefined,
                file: undefined,
                info: undefined
            }, object);
        case "trace":
        case "trace.aborted":
            return Object.assign({
                type: undefined,
                reason: undefined,
                parent: undefined,
                link: undefined,
                trace: undefined,
                info: undefined
            }, object);
        default:
            return Object.assign({ type: undefined }, object);
        }
    });
    return result;
}

function runLuaCode(code, options, callback) {
    const sourceFile = new TmpFile(code);
    const outputFile = new TmpFile();

    runInSandbox({
        cmd: ['/usr/bin/instrument.lua', '-o/tmp/instrument.out', '/tmp/source.lua'],
        timeLimit: options.timeout/1000,
        workDir: '/root',
        chroot: '/usr/lib/luajit.me/images/' + options.target,
        mounts: [
            {type: 'bind', dest: '/dev', src: '/usr/lib/luajit.me/images/dev'},
           // {type: 'proc', dest: '/proc'},
            {type: 'tmpfs', dest: '/tmp'},
            {type: 'tmpfs', dest: '/dev/shm'},
            {type: 'tmpfs', dest: '/root'},
            {type: 'bind', dest: '/tmp/source.lua', src: sourceFile.path, ro: true}
        ],
        pipes: [
            // {dest: "/dev/stderr", stderr: true},
            {dest: outputFile.path, src: '/tmp/instrument.out', limit: 2*1024*1024}
        ],
        seccompPolicy: `
            ALLOW {
                access, arch_prctl, brk, clock_gettime, /* clone, */ close,
                dup, dup2, execve, exit_group, fcntl, getcwd, getegid,
                geteuid, getgid, getgroups, getpid, getppid, getuid,
                ioctl, lseek, madvise, mmap, mprotect, munmap, newfstat,
                newstat, newuname, open, pipe, pipe2, read, readv,
                rt_sigaction, rt_sigprocmask, rt_sigreturn,
                set_tid_address, wait4, write, writev
            }
            DEFAULT DENY
        `
    }, function(error, response) {
        let output;
        try {
            if (!error)
                output = massage(JSON.parse(fs.readFileSync(outputFile.fd)));
        } catch(e) {
            error = e;
        }
        sourceFile.destroy();
        outputFile.destroy();
        callback(error, output);
    });
}

module.exports = { runLuaCode };
