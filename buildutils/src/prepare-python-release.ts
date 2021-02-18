/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import commander from 'commander';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as utils from './utils';

// Specify the program signature.
commander
  .description('Publish the JS packages and prep the Python package')
  .option(
    '--skip-build',
    'Skip the clean and build step (if there was a network error during a JS publish'
  )
  .action(async (options: any) => {
    // Make sure all current JS packages are published.
    console.log('Checking for published packages...');
    utils.getCorePaths().forEach(pkgPath => {
      const pkgJson = path.join(pkgPath, 'package.json');
      const pkgData = utils.readJSONFile(pkgJson);
      const specifier = `${pkgData.name}@${pkgData.version}`;
      const cmd = `npm info ${specifier}`;
      const output = utils.run(cmd, { stdio: 'pipe' }, true);
      console.log(specifier);
      if (output.indexOf('dist-tags') === -1) {
        console.log(`${specifier} is not yet available`);
      }
    });

    const distDir = './dist';

    // Clean the dist directory.
    if (fs.existsSync(distDir)) {
      fs.removeSync(distDir);
    }

    // Update core mode.  This cannot be done until the JS packages are
    // released.
    //utils.run('node buildutils/lib/update-core-mode.js');

    // Make the Python release.
    utils.run('python -m pip install -U twine build');
    utils.run('python -m build .');
    utils.run('twine check dist/*');

    const files = fs.readdirSync(distDir);
    const hashes = new Map<string, string>();
    files.forEach(file => {
      const shasum = crypto.createHash('sha256');
      const hash = shasum.update(fs.readFileSync(path.join(distDir, file)));
      hashes.set(file, hash.digest('hex'));
    });

    const hashString = Array.from(hashes.entries())
      .map(entry => `${entry[0]}: ${entry[1]}`)
      .join('" -m "');

    // Make the commit and the tag.
    const curr = utils.getPythonVersion();
    utils.run(
      `git commit -am "Publish ${curr}" -m "SHA256 hashes:" -m "${hashString}"`
    );
    //utils.run(`git tag v${curr}`);

    // Prompt the user to finalize.
    console.debug('*'.repeat(40));
    console.debug('*'.repeat(40));
    console.debug('Ready to publish!');
    console.debug('Run these command when ready:');
    console.debug('twine upload dist/*');
    console.debug('git push origin <BRANCH> --tags');

    // Emit a system beep.
    process.stdout.write('\x07');
  });

commander.parse(process.argv);
