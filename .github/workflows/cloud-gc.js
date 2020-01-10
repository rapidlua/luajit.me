// Deletes:
//  * runaway droplets left behind by Packer;
//  * leftower SSH keys from Packer;
//  * images no longer referenced by a deployment.
const URL = require('url').URL;
const https = require('https');
const child_process = require('child_process');

https.globalAgent.maxSockets = 50; // max concurrent requests (per host)

const gitHubHeaders = {
  'User-Agent': 'cloudgc',
  Authorization: 'token ' + process.env.GITHUB_TOKEN,
  Accept: 'application/vnd.github.ant-man-preview+json'
};

const digitalOceanHeaders = {
  Authorization: 'Bearer ' + process.env.DIGITALOCEAN_TOKEN
}

function fatal(...args) {
  console.error(...args);
  process.exit(1);
}

function ageInHours(createdAt) {
  return (Date.now() - new Date(createdAt)) / (1000 * 60 * 60);
}

function restAPICall(method, url, headers, cb) {
  if (process.env.DRY_RUN && method !== 'GET') return cb(null, null);
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

function getDeployedHashes(environments, cb) {
  const hashes = [];
  const envFound  = new Array(environments ? environments.length : 2).fill(false);
  let pending = 1;
  function fetch(url) {
    restAPICall('GET', url, gitHubHeaders, (err, responseJSON, response) => {
      if (err) {
        cb && cb(err);
        cb = null;
        return;
      }
      for (let deployment of responseJSON) {
        const index = environments ? environments.indexOf(deployment.environment) : 0;
        if (index >= 0 && deployment.statuses_url.startsWith('https://api.github.com/')) {
          ++pending;
          restAPICall('GET', deployment.statuses_url, gitHubHeaders, (err, statuses) => {
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

const A_DropletKeep   = 'INST KEEP';
const A_DropletDelete = 'INST DEL ';
const A_ImageKeep     = 'IMG  KEEP';
const A_ImageDelete   = 'IMG  DEL ';

// Policy: delete SSH key if created by Packer and older than 30 minutes
// Why: Packer crashed / cancelled build
//
// Nice to have, unfortunately there's no 'created_at' attribute for
// SSH keys.  Since this has no financial impact and very little
// security impact, leave it out for now.

// Policy: delete droplet if created by Packer and older than 30 minutes
// Why: Packer crashed / cancelled build
function maybeDeleteDroplet(providerTag, name, birthDate, del) {
  if (name.startsWith('packer-') && ageInHours(birthDate) > .5) {
    del((err) => {
      if (err) fatal(providerTag, A_DropletDelete, name + ':', err);
      console.log(providerTag, A_DropletDelete, name);
    });
  } else {
    console.log(providerTag, A_DropletKeep, name);
  }
}

// Policy: delete image if not referenced by succesfull production
// deployment and that is older than 60 minutes
// Why: every build produces an image
let maybeDeleteImage = (function() {
  const pending = [];
  getDeployedHashes([ 'production' ], (err, hashes) => {
    if (err) fatal('get deployed hashes:', err);
    function isOrphanedImage(name) {
      if (!name.startsWith('image-'))
        return false;
      const res = child_process.spawnSync(
        'git', [ 'rev-parse', '--verify', 'v' + name.substr(6) ],
        { encoding: 'utf8' }
      );
      return res.status || !hashes.includes(res.stdout.trim());
    }
    maybeDeleteImage = function(providerTag, name, birthDate, del) {
      if (isOrphanedImage(name) && ageInHours(birthDate) > .5) {
        del((err) => {
          if (err) fatal(providerTag, A_ImageDelete, name + ':', err);
          console.log(providerTag, A_ImageDelete, name);
        });
      } else {
        console.log(providerTag, A_ImageKeep, name);
      }
    };
    pending.forEach((args) => maybeDeleteImage(...args));
  });
  return (...args) => void pending.push([...args]);
}) ();

function enumerateDigitalOceanEntities(key, url, cb) {
  const results = [];
  function fetch(url) {
    restAPICall('GET', url, digitalOceanHeaders, (err, responseJSON) => {
      if (err)
        return cb(err);
      results.push(...responseJSON[key]);
      let next;
      try {
        if (responseJSON.links.pages.next.startsWith('https://api.digitalocean.com/'))
          next = responseJSON.links.pages.next;
      } catch (e) {}
      if (next)
        fetch(next);
      else
        cb(null, results);
    });
  }
  fetch(url);
}

// GC droplets (DigitalOcean)
enumerateDigitalOceanEntities(
  'droplets', 'https://api.digitalocean.com/v2/droplets?per_page=200',
  (err, droplets) => {
    if (err) fatal('list DigitalOcean droplets:', err);
    for (let droplet of droplets)
      maybeDeleteDroplet('[DO]', droplet.name, droplet.created_at, (cb) => {
        restAPICall('DELETE', 'https://api.digitalocean.com/v2/droplets/' + droplet.id, digitalOceanHeaders, cb);
      });
  }
);

// GC images (DigitalOcean)
enumerateDigitalOceanEntities(
  'images', 'https://api.digitalocean.com/v2/images?private=true&per_page=200',
  (err, images) => {
    if (err) fatal('list DigitalOcean private images:', err);
    for (let image of images) {
      if (image.type === 'snapshot') {
        maybeDeleteImage('[DO]', image.name, image.created_at, (cb) => {
          restAPICall('DELETE', 'https://api.digitalocean.com/v2/images/' + image.id, digitalOceanHeaders, cb);
        });
      }
    }
  }
);
