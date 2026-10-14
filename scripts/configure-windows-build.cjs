const fs=require('node:fs');const p=require('../package.json');
p.description='Tu web empieza aquí. WordPress local para Windows y macOS.';
p.scripts['prepare:windows']='pwsh -NoProfile -File scripts/build-native.ps1 && pwsh -NoProfile -File scripts/prepare-windows.ps1 && pwsh -NoProfile -File scripts/prepare-crt.ps1 && node scripts/prepare-migration.cjs';
p.scripts['dist:win']='electron-builder --win nsis --x64';
p.scripts['test:windows']='node scripts/run-windows-tests.cjs';
p.scripts['test:migration:windows']='node scripts/test-migration-windows.cjs';
p.build.extraResources=[{from:'.local/migration-assets',to:'migration'}];
p.build.mac.extraResources=[{from:'.local/engine',to:'engine'}];
p.build.win={target:[{target:'nsis',arch:['x64']}],icon:'config/assets/sitioo.png',artifactName:'SITIOO-${version}-windows-x64-setup.${ext}',extraResources:[{from:'.local/engine-windows-x64',to:'engine',filter:['**/*','!**/*.pdb','!**/*.extracted.sha256']},{from:'licenses',to:'licenses'}]};
p.build.nsis={oneClick:false,perMachine:false,allowElevation:false,allowToChangeInstallationDirectory:true,packElevateHelper:false,deleteAppDataOnUninstall:false,createDesktopShortcut:false,createStartMenuShortcut:true,runAfterFinish:false,installerLanguages:['es_ES'],include:'config/installer.nsh',license:'LICENSE'};
p.build.forceCodeSigning=false;
fs.writeFileSync(require('node:path').resolve('package.json'),JSON.stringify(p,null,2)+'\n');

