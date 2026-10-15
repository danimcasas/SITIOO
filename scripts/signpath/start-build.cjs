const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const c = require('./common.cjs');
c.mode();
if (process.platform !== 'win32') throw new Error('Windows is required.');
const folder = c.workspace();
const pidFile = path.join(folder, 'build.pid');
if (!fs.existsSync(path.join(folder, 'context.json')) || fs.existsSync(pidFile)) throw new Error('A fresh initialized workspace is required.');
const out = fs.openSync(path.join(folder, 'build.stdout.log'), 'wx');
const err = fs.openSync(path.join(folder, 'build.stderr.log'), 'wx');
// Separate all standard handles so the GitHub step can exit without closing the packager.
// Keep RUNNER_TRACKING_ID unchanged so GitHub can still clean up at the end of the job.
const child = spawn(process.execPath, [path.join(__dirname, 'build.cjs')], {
  cwd: c.root, detached: true, windowsHide: true, stdio: ['ignore', out, err]
});
child.once('error', error => {
  fs.closeSync(out); fs.closeSync(err);
  console.error(error.message); process.exitCode = 1;
});
child.once('spawn', () => {
  try {
    fs.writeFileSync(pidFile, String(child.pid), {flag: 'wx'});
    child.unref();
    console.log('Packager started with independent file streams; signing stages are checked in order.');
  } catch (error) {
    child.kill(); // Only the child started by this launcher.
    console.error(error.message); process.exitCode = 1;
  } finally {
    fs.closeSync(out); fs.closeSync(err);
  }
});
