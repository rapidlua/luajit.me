const URL = require('url').URL;
const https = require('https');
const child_process = require('child_process');

function apiCall(url, method, headers, cb) {
  const u = new URL(url);
  const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers }, (res) => {
    if (res.statusCode !== 200 && res.statusCode !== 204) {
      cb(new Error(res.statusMessage));
      return;
    }
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      try {
        if (res.statusCode === 204) cb(null, null);
        else cb(null, JSON.parse(Buffer.concat(chunks).toString()), res);
      } catch (e) {
        cb(e);
      }
    });
  });
  req.on('error', cb);
  req.end();
}

function getDeployedHashes(headers, environments, cb) {
  const hashes = [];
  const envFound  = new Array(environments ? environments.length : 2).fill(false);
  let pending = 1;
  function fetch(url) {
    apiCall(url, 'GET', headers, (err, responseJSON, response) => {
      if (err) {
        cb && cb(err);
        cb = null;
        return;
      }
      for (let deployment of responseJSON) {
        const index = environments ? environments.indexOf(deployment.environment) : 0;
        if (index >= 0 && deployment.statuses_url.startsWith('https://api.github.com/')) {
          ++pending;
          apiCall(deployment.statuses_url, 'GET', headers, (err, statuses) => {
            if (err) {
              cb && cb(err);
              cb = null;
              return;
            }
            if (statuses[0] && statuses[0].state == 'success') {
              hashes.push(deployment.sha);
              envFound[index] = true;
            }
            if (!--pending && cb) {
              cb(null, hashes);
              cb = null;
            }
          });
        }
      }
      const match = (response.headers.link || '').match(/<(.[^>]+)>;\s*rel="next"/);
      if (cb && match && match[1] && match[1].startsWith('https://api.github.com/')) {
        if (!envFound.every(_ => _)) {
          fetch(match[1]);
          return;
        }
      }
      if (!--pending && cb) {
        cb(null, hashes);
        cb = null;
      }
    });
  }
  fetch('https://api.github.com/repos/rapidlua/luajit.me/deployments');
}

function listDigitalOceanPrivateImages(headers, cb) {
  const images = [];
  function fetch(url) {
    apiCall(url, 'GET', headers, (err, response) => {
      if (err)
        return cb(err);
      images.push(...response.images);
      try {
        if (response.links.pages.next.startsWith('https://api.digitalocean.com/'))
          return fetch(response.links.pages.next);
      } catch (e) {}
      cb(null, images);
    });
  }
  fetch('https://api.digitalocean.com/v2/images?private=true&per_page=200');
}

function isOrphanedImage(name, hashes) {
  if (!name.startsWith('image-'))
    return false;
  const res = child_process.spawnSync(
    'git', [ 'rev-parse', '--verify', 'v' + name.substr(6) ],
    { encoding: 'utf8' }
  );
  return res.status || !hashes.includes(res.stdout.trim());
}

function fatal(...args) {
  console.error(...args);
  process.exit(1);
}

const githubHeaders = {
  'User-Agent': 'rapidlua',
  Authorization: 'token ' + process.env.GITHUB_TOKEN,
  Accept: 'application/vnd.github.ant-man-preview+json'
};

const digitalOceanHeaders = {
  Authorization: 'Bearer ' + process.env.DIGITALOCEAN_TOKEN
}

function hourToMSec(v) { return v * 1000 * 60 * 60; }

getDeployedHashes(githubHeaders, [ 'production' ], (err, hashes) => {
  if (err) fatal('get deployed hashes:', err);
  listDigitalOceanPrivateImages(digitalOceanHeaders, (err, images) => {
    if (err) fatal('list DigitalOcean private images:', err);
    for (let image of images) {
      if (image.type === 'snapshot' && Date.now() - new Date(image.created_at) > hourToMSec(3) && isOrphanedImage(image.name, hashes)) {
        apiCall('https://api.digitalocean.com/v2/images/' + image.id, 'DELETE', digitalOceanHeaders, (err) => {
          if (err) fatal('removing ' + image.name + ':', err);
          console.log('removed', image.name);
        });
      }
    }
  });
});
