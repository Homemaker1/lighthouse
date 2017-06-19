import {existsSync} from 'fs';
import {join as joinPath} from 'path';

import {Configstore, inquirer} from './shim-modules';

const log = require('../lighthouse-core/lib/log');

const MAXIMUM_WAIT_TIME = 20 * 1000;

const MESSAGE = [
  'Lighthouse would like to report back any errors that might occur while auditing. \n  ',
  'Information such as the URL you are auditing, its subresources, your operating system, Chrome, ',
  'and Lighthouse versions may be recorded. Would you be willing to have Lighthouse automatically ',
  'report this information to the team to aid in improving the product?',
].join('');

async function prompt() {
  if (!process.stdout.isTTY || process.env.CI) {
    // Default non-interactive sessions to false
    return false;
  }

  let timeout: NodeJS.Timer;

  const prompt = inquirer.prompt([
    {
      type: 'confirm',
      name: 'isErrorReportingEnabled',
      default: false,
      message: MESSAGE,
    },
  ]);

  const timeoutPromise = new Promise((resolve: (a: boolean) => {}) => {
    timeout = setTimeout(() => {
      prompt.ui.close();
      process.stdout.write('\n');
      log.warn('CLI', 'No response to error logging preference, errors will not be reported.');
      resolve(false);
    }, MAXIMUM_WAIT_TIME);
  });

  return Promise.race([
    prompt.then((result: {isErrorReportingEnabled: boolean}) => {
      clearTimeout(timeout);
      return result.isErrorReportingEnabled;
    }),
    timeoutPromise,
  ]);
}

export async function askPermission() {
  const configstore = new Configstore('lighthouse');
  let isErrorReportingEnabled = configstore.get('isErrorReportingEnabled');
  if (typeof isErrorReportingEnabled === 'boolean') {
    return isErrorReportingEnabled;
  }

  isErrorReportingEnabled = await prompt();
  configstore.set('isErrorReportingEnabled', isErrorReportingEnabled);
  return isErrorReportingEnabled;
}

export function isDev() {
  return existsSync(joinPath(__dirname, '../.git'));
}
