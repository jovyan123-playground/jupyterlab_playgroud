const fs = require('fs');
const child_process = require('child_process');
const path = require('path');
const os = require('os');
const ps = require('process');
const utils = require('./utils');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))


// configurables: target dir - %TEMPDIR%/verdaccio
//                port - 4873
async function startLocalRegistry() {
    console.log('hello???')
    await stopLocalRegistry();

    // make a known dir in /tmp to run verdaccio
    const out_dir = path.join(os.tmpdir(), 'verdaccio');
    if (!fs.existsSync(out_dir)) {
        fs.mkdirSync(out_dir);
    }

    // Get current registry values
    const prev_npm = utils.run('npm config get registry', { stdio: 'pipe' }, true);
    let prev_yarn = ''
    try {
        prev_yarn = utils.run('yarn config get registry', { stdio: 'pipe' }, true);
    } catch {
    }

    // copy the config file there
    const config = path.join(out_dir, 'verdaccio.yml');
    const config_path = require.resolve('@jupyterlab/buildutils/verdaccio.yml');
    console.log('Using config path', config_path);
    fs.copyFileSync(config_path, config);

    // Use existing registry if set
    if (prev_npm) {
        let text = fs.readFileSync(config, {encoding: 'utf-8'});
        text = text.replace("https://registry.npmjs.org/", prev_npm);
        fs.writeFileSync(config, text, { encoding: 'utf-8' })
    }

    const log_file = path.join(out_dir, 'verdaccio.log');

    // Start local registry
    let port = 5559;
    const args = `-c verdaccio.yml -l localhost:${port}`;
    console.log('Starting in', out_dir);
    console.log('>', 'verdaccio', args);

    const out = fs.openSync(log_file, 'a');
    const err = fs.openSync(log_file, 'a');

    const options = { cwd: out_dir, detached: true, stdio: ['ignore', out, err] };

    const bin_dir = utils.run('npm bin', { stdio: 'pipe' }, true);
    console.log('wtf', bin_dir);
    const verdaccio_bin = path.join(bin_dir, 'verdaccio');
    console.log('starting', verdaccio_bin);
    const subproc = child_process.spawn(verdaccio_bin, args.split(' '), options);
    subproc.unref();

    // Wait for Verdaccio to boot
    let content = '';
    while (true) {
        ps.stdout.write('.');
        if (content.indexOf('http address') !== -1) {
            break
        }
        if (content.indexOf('ERR!') !== -1) {
            console.error(content);
            ps.exit(1);
        }
        await delay(100);
        if (fs.existsSync(log_file)) {
            content = fs.readFileSync(log_file, {encoding: 'utf-8'});
        }
    }
    console.log('\nverdaccio started');

    // Store registry values and pid in files
    const info_file = path.join(out_dir, 'info.json');
    const data = {
        prev_npm,
        prev_yarn,
        pid: subproc.pid
    }
    utils.writeJSONFile(info_file, data);

    // Set registry to local registry
    const custom_registry_url = `http://localhost:${port}`;
    child_process.execSync(`npm set registry "${custom_registry_url}"`)
    try {
        child_process.execSync(`yarn config set registry "${custom_registry_url}"`)
    } catch (e) {
        // yarn not available
    }

    console.log('\nRunning in', out_dir);
    ps.exit(0);
}


// Restore the original NPM and Yarn registry URLs and stop Verdaccio
// configurables: target dir - %TEMPDIR%/verdaccio
async function stopLocalRegistry() {
    // Get the pid and the previous registry entries from the info file
    const out_dir = path.join(os.tmpdir(), 'verdaccio');
    if (!fs.existsSync(out_dir)) {
        return
    }
    const info_file = path.join(out_dir, 'info.json');
    if (!fs.existsSync(info_file)) {
        return;
    }
    const data = utils.readJSONFile(info_file);

    // Kill the pid
    console.log(`Killing process ${data.pid}`);
    try {
        ps.kill(data.pid);
    } catch (e) {
        // No process running
    }

    // Restore the previous registry entries
    if (data.prev_npm) {
        child_process.execSync(`npm set registry ${data.prev_npm}`);
    } else {
        child_process.execSync(`npm config rm registry`);
    }
    if (data.prev_yarn) {
        child_process.execSync(`yarn config set registry ${data.prev_yarn}`);
    } else {
        try {
            child_process.execSync(`yarn config delete registry`)
        } catch (e) {
            // yarn not available
        }
    }
}


if (require.main === module) {
    let cmd = startLocalRegistry;
    if (ps.argv.length === 3 && ps.argv[2] === 'stop') {
        cmd = stopLocalRegistry;
    }
    (async function () {
        await cmd();
    })()
}
