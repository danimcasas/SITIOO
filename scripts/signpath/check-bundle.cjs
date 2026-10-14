const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const c=require('./common.cjs');
(async()=>{
 const signed=c.mode()==='signpath';
 const base=path.join(c.workspace(),'build');
 const app=path.join(base,'win-unpacked');
 const manifest=JSON.parse(fs.readFileSync(path.join(app,'resources/migration/plugin-manifest.json'),'utf8'));
 const {hashes}=require('../../packages/migration/plugin-manager.cjs');
 const actual=await hashes(path.join(app,'resources/migration/sitioo-migration'));
 if(JSON.stringify(actual)!==JSON.stringify(manifest.files))throw new Error('Plugin manifest mismatch after packaging.');
 const expectedHelper=c.sha256(path.join(c.root,'.local/native/sitioo-win.exe'));
 for(const file of ['resources/engine/bin/sitioo-win.exe','resources/migration/sitioo-migration/bin/sitioo-win.exe'])if(c.sha256(path.join(app,file))!==expectedHelper)throw new Error('The signed native helper was changed or replaced.');
 const checked=[path.join(app,'SITIOO.exe'),path.join(app,'resources/engine/bin/sitioo-win.exe'),path.join(c.workspace(),'uninstaller',signed?'signed':'',c.installerName.replace(/exe$/,'__uninstaller.exe')),path.join(base,c.installerName)];
 for(const file of checked)execFileSync('pwsh',['-NoProfile','-File',path.join(__dirname,'verify-file.ps1'),'-Path',file,...(signed?['-RequireSignature']:[])],{stdio:'inherit',windowsHide:true});
 // Preserve third-party engine bytes. Never sign PHP, MariaDB or their DLLs under SITIOO's identity.
 let thirdParty=0;
 function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const f=path.join(folder,entry.name);if(entry.isDirectory())walk(f);else if(/\.(exe|dll)$/i.test(entry.name)&&path.relative(path.join(app,'resources/engine'),f)!==path.join('bin','sitioo-win.exe')){const relative=path.relative(path.join(app,'resources/engine'),f);if(c.sha256(f)!==c.sha256(path.join(c.root,'.local/engine-windows-x64',relative)))throw new Error('Third-party binary changed: '+entry.name);thirdParty++;}}}
 walk(path.join(app,'resources/engine'));
 const report={version:c.version,mode:c.mode(),commit:process.env.GITHUB_SHA||'local',files:checked.map(file=>({file:path.basename(file),sha256:c.sha256(file)})),pluginManifestVerified:true,helperCopiesIdentical:true,thirdPartyBinariesUnchanged:thirdParty,installationTested:false};
 c.writeNewJson(path.join(c.workspace(),'verification.json'),report);
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
