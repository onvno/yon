const fs = require('mz/fs');
const get = require('./get');
const homedir = require('node-homedir');
const _rimraf = require('rimraf');
const _mkdirp = require('mkdirp');
const cp = require('child_process');
const path = require('path');
const config = require('./config');
const runscript = require('runscript');

exports.getBinaryMirrors = function* getBinaryMirrors(registry) {
  const registries = [ registry ].concat([
    'https://registry.npm.taobao.org',
    'https://r.cnpmjs.org',
    'https://registry.npmjs.org',
  ]);
  let lastErr;
  let binaryMirrors;
  for (const registry of registries) {
    const binaryMirrorUrl = registry + '/binary-mirror-config/latest';
    try {
      const res = yield get(binaryMirrorUrl, {
        dataType: 'json',
        followRedirect: true,
        // don't retry
        retry: 0,
      });
      binaryMirrors = res.data.mirrors.china;
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!binaryMirrors) {
    console.warn('Get /binary-mirror-config/latest from %s error: %s', registry, lastErr.stack);
    binaryMirrors = require('binary-mirror-config/package.json').mirrors.china;
  }

  return binaryMirrors;
};


exports.sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

exports.formatPath = pathname => {
  if (pathname[0] === '~') {
    // convert '~/foo/path' => '$HOME/foo/path'
    pathname = homedir() + pathname.substring(1);
  }
  return pathname;
};

exports.getGlobalPrefix = prefix => {
  if (!prefix) {
    try {
      prefix = cp.execSync('npm config get prefix').toString().trim();
    } catch (err) {
      throw new Error(`exec npm config get prefix ERROR: ${err.message}`);
    }
  }
  return exports.formatPath(prefix);
};

exports.getGlobalInstallMeta = prefix => {
  prefix = exports.getGlobalPrefix(prefix);
  const meta = {
    targetDir: prefix,
    binDir: prefix,
  };
  if (process.platform !== 'win32') {
    meta.targetDir = path.join(prefix, 'lib');
    meta.binDir = path.join(prefix, 'bin');
  }
  return meta;
};

exports.rimraf = function rimraf(dir) {
  return new Promise((resolve, reject) => {
    _rimraf(dir, err => {
      err ? reject(err) : resolve();
    });
  });
};

exports.mkdirp = function mkdirp(dir, mod) {
  return new Promise((resolve, reject) => {
    _mkdirp(dir, mod, err => {
      err ? reject(err) : resolve();
    });
  });
};

exports.readJSON = function* readJSON(filepath) {
  if (!(yield fs.exists(filepath))) {
    return {};
  }
  const content = yield fs.readFile(filepath, 'utf8');
  try {
    return JSON.parse(content.trim());
  } catch (err) {
    err.message += ` (file: ${filepath})`;
    console.error('content buffer: %j', yield fs.readFile(filepath));
    throw err;
  }
};
