const fs = require('node:fs');
const path = require('node:path');
const c = require('./common.cjs');
(async () => {
  c.mode();
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Windows x64 is required.');
  const {build, Platform, Arch} = require('electron-builder');
  await build({publish:'never', targets:Platform.WINDOWS.createTarget(['nsis'], Arch.x64), config:path.join(c.root, 'config/electron-builder.signpath.cjs')});
  for (const stage of ['application', 'uninstaller', 'installer']) {
    if (!fs.existsSync(path.join(c.workspace(), stage, 'request.json'))) throw new Error(`Missing signing stage ${stage}.`);
  }
  const exe = path.join(c.workspace(), 'build', c.installerName);
  c.writeNewJson(path.join(c.workspace(), 'completed.json'), {version:c.version, mode:c.mode(), installer:c.installerName, sha256:c.sha256(exe)});
})().catch(error => {
  console.error(error.message);
  try { c.writeNewJson(path.join(c.workspace(), 'failed.json'), {error:'Packaging or signature verification failed.'}); } catch {}
  process.exitCode=1;
});
