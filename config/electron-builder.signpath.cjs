const path = require('node:path');
const base = require('../package.json').build;
const c = require('../scripts/signpath/common.cjs');
const production = c.mode() === 'signpath';
module.exports = {
  ...base,
  directories:{...base.directories, output:path.join(c.workspace(), 'build')},
  buildNumber:c.numericVersion.split('.').at(-1),
  publish:null,
  forceCodeSigning:production,
  win:{...base.win,
    // Third-party executables and DLLs are never sent to our custom signer.
    signExts:['SITIOO.exe', 'windows-x64-setup.exe', '__uninstaller.exe', '!.exe'],
    signtoolOptions:{sign:path.resolve(__dirname, '../scripts/signpath/hook.cjs'), signingHashAlgorithms:['sha256']}
  },
  nsis:{...base.nsis, include:path.join(c.workspace(),'installer.nsh'), differentialPackage:false}
};
