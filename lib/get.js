const debug = require('debug')('yon:get');
const urllib = require('urllib');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const destroy = require('destroy');
const utils = require('./utils');

module.exports = get;

const httpKeepaliveAgent = new HttpAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 10,
});
const httpsKeepaliveAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 10,
});

const USER_AGENT = 'npminstall/' + require('../package.json').version + ' ' + urllib.USER_AGENT;
const MAX_RETRY = 5;

function* get(url, options, globalOptions) {
  options.httpsAgent = httpsKeepaliveAgent;
  options.agent = httpKeepaliveAgent;
  options.headers = options.headers || {};
  options.headers['User-Agent'] = USER_AGENT;
  if (globalOptions) {
    options.rejectUnauthorized = globalOptions.strictSSL;
    if (globalOptions.referer) {
      options.headers.Referer = globalOptions.referer;
    }
  }
  const retry = options.retry || options.retry === 0 ? options.retry : MAX_RETRY;
  options.retry = undefined;
  const result = yield _get(url, options, retry, globalOptions);
  debug('GET %s, headers: %j from %j', result.status, result.headers, url);
  if (result.status < 100 || result.status >= 300) {
    if (options.streaming) {
      destroy(result.res);
    }
    let message = `GET ${url} response ${result.status} status`;
    if (result.headers && result.headers['npm-notice']) {
      message += `, ${result.headers['npm-notice']}`;
    }
    const err = new Error(message);
    err.status = result.status;
    throw err;
  }
  return result;
}

function* _get(url, options, retry, globalOptions) {
  try {
    return yield urllib.request(url, options);
  } catch (err) {
    retry--;
    if (retry > 0) {
      const delay = 100 * (MAX_RETRY - retry);
      const logger = globalOptions && globalOptions.console || console;
      logger.warn('[npminstall:get] retry GET %s after %sms, retry left %s, error: %s',
        url, delay, retry, err);
      yield utils.sleep(delay);
      return yield _get(url, options, retry, globalOptions);
    }

    throw err;
  }
}