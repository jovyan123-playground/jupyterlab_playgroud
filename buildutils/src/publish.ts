/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import * as path from 'path';
import { handlePackage } from './update-dist-tag';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Publish the JS packages')
  .option(
    '--skip-build',
    'Skip the clean and build step (if there was a network error during a JS publish'
  )
  .action(async (options: any) => {
    // Make sure we are logged in.
    if (utils.checkStatus('npm whoami') !== 0) {
      console.error('Please run `npm login`');
    }

    // Publish JS to the appropriate tag.
    const curr = utils.getPythonVersion();
    if (curr.indexOf('rc') === -1 && curr.indexOf('a') === -1) {
      utils.run('lerna publish from-package -m "Publish"');
    } else {
      utils.run('lerna publish from-package --dist-tag=next -m "Publish"');
    }

    // Fix up any tagging issues.
    const basePath = path.resolve('.');
    const paths = utils.getLernaPaths(basePath).sort();
    const cmds = await Promise.all(paths.map(handlePackage));
    cmds.forEach(cmdList => {
      cmdList.forEach(cmd => {
        utils.run(cmd);
      });
    });

    // Emit a system beep.
    process.stdout.write('\x07');
  });

commander.parse(process.argv);
