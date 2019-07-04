const fs = require('fs');
const child_process = require('child_process');
const targets = require('./targets').targets;

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

function runLuaCode(code, options, callback) {
    const sourceFile = new TmpFile(code);
    const outputFile = new TmpFile();

    const target = targets.indexOf(options.target)===-1 ?
        targets[targets.length - 1] : options.target;

    runInSandbox({
        cmd: ['/usr/bin/instrument.lua', '-o/tmp/instrument.out', '/tmp/source.lua'],
        timeLimit: options.timeout/1000,
        workDir: '/root',
        chroot: '/usr/lib/luajit.me/images/' + target,
        mounts: [
            {type: 'bind', dest: '/dev', src: '/usr/lib/luajit.me/images/dev'},
           // {type: 'proc', dest: '/proc'},
            {type: 'tmpfs', dest: '/tmp'},
            {type: 'tmpfs', dest: '/dev/shm'},
            {type: 'tmpfs', dest: '/root'},
            {type: 'bind', dest: '/tmp/source.lua', src: sourceFile.path, ro: true}
        ],
        pipes: [
            {file: outputFile.path, fifo: '/tmp/instrument.out', limit: 2*1024*1024}
        ],
        seccompPolicy: `
            ALLOW {
                access, arch_prctl, brk, clock_gettime, clone, close,
                dup, dup2, execve, exit_group, fcntl, getcwd, getegid,
                geteuid, getgid, getgroups, getpid, getppid, getuid,
                ioctl, lseek, madvise, mmap, mprotect, munmap, newfstat,
                newstat, newuname, open, pipe, pipe2, read, readv,
                rt_sigaction, rt_sigprocmask, rt_sigreturn,
                set_tid_address, wait4, write, writev
            }
            DEFAULT LOG
        `
    }, function(error, response) {
        const output = error ? undefined : fs.readFileSync(outputFile.fd);
        sourceFile.destroy();
        outputFile.destroy();
        callback(error, output);
    });
}

module.exports = { runLuaCode };
