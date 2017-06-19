const log = require('./log');

// eslint-disable-next-line max-len
const SENTRY_URL = 'https://a6bb0da87ee048cc9ae2a345fc09ab2e:63a7029f46f74265981b7e005e0f69f8@sentry.io/174697';

// Fix the polyfill. See https://github.com/GoogleChrome/lighthouse/issues/73
self.setImmediate = function(callback, ...argsForCallback) {
  Promise.resolve().then(() => callback(...argsForCallback));
  return 0;
};

const noop = () => Promise.resolve();
const sentryApi = {
  captureMessage: noop,
  captureException: noop,
  captureBreadcrumb: noop,
  mergeContext: noop,
  getContext: noop,
};

/**
 * We'll create a delegate for sentry so that environments without error reporting enabled will use
 * noop functions and environments with error reporting will call the actual Sentry methods.
 */
const sentryDelegate = Object.assign({}, sentryApi);
sentryDelegate.init = function init(opts) {
  if (!opts.flags.enableErrorReporting) {
    // If error reporting is disabled, leave the functions as a noop
    return;
  }

  const environmentData = opts.environmentData || {};
  const sentryConfig = Object.assign({}, environmentData, {allowSecretKey: true});

  try {
    const Sentry = require('raven');
    Sentry.config(SENTRY_URL, sentryConfig).install();
    Object.keys(sentryApi).forEach(functionName => {
      // Have each delegate function call the corresponding sentry function by default
      sentryDelegate[functionName] = (...args) => Sentry[functionName](...args);
    });

    // Special case captureException to skip reporting if the error was expected
    sentryDelegate.captureException = (...args) => {
      if (args[0] && args[0].expected) return Promise.resolve();
      return new Promise(resolve => {
        Sentry.captureException(...args, () => resolve());
      });
    };
  } catch (e) {
    log.warn(
      'sentry',
      'Could not load raven library, errors will not be reported.'
    );
  }

  const context = {
    url: opts.url,
    deviceEmulation: !opts.flags.disableDeviceEmulation,
    networkThrottling: !opts.flags.disableNetworkThrottling,
    cpuThrottling: !opts.flags.disableCpuThrottling,
  };

  sentryDelegate.mergeContext({extra: Object.assign({}, environmentData.extra, context)});
  return context;
};

module.exports = sentryDelegate;
