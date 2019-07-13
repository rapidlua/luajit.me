const crypto = require('crypto');
const childProcess = require('child_process');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const rawParser = bodyParser.raw({ type: '*/*' });

const jobQueue = new require('async-limiter')({ concurrency: 1 });

function scheduleDeployJob(command) {
  jobQueue.push(function (onJobDone) {
    childProcess.spawn(
      '. ' + __dirname + '/lib.sh;' + command, [],
      { stdio: [ null, null, process.stderr ], shell: true }
    ).on('close', function (code, signal) {
      if (code === 100) {
        // agent updated; restart
        process.exit();
      }
      onJobDone();
    });
  });
}

scheduleDeployJob('fetch_source_code; build; deploy');

function computeGitHubSignature(data) {
  return 'sha1=' + crypto.createHmac(
    'sha1', process.env['GITHUB_SECRET']).update(data).digest('hex');
}

function secureEqual(a, b) {
  a = new Buffer(a);
  b = new Buffer(b);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post('/trigger-deploy', rawParser, function (req, res) {
  const signature = req.header('X-Hub-Signature');
  if (signature && req.body instanceof Buffer
    && secureEqual(signature, computeGitHubSignature(req.body))
  ) {
    res.status(200).send();
    scheduleDeployJob('fetch_source_code; cond_build_and_deploy');
  } else {
    res.status(500).send('Signature mismatch');
  }
});

app.listen(8000);
