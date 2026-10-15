'use strict';
const {spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path');
async function command(file,args,extra={}){
 const env={...process.env,...extra};delete env.ELECTRON_RUN_AS_NODE;
 await new Promise((resolve,reject)=>{const child=spawn(file,args,{stdio:'inherit',env});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error('La comprobación '+path.basename(args[0]||file)+' no terminó correctamente.')));});
}
(async()=>{
 if(process.platform!=='darwin')throw new Error('Estas pruebas requieren un Mac real.');
 await fs.mkdir('.local/mac-evidence',{recursive:true});
 const tests=(await fs.readdir('tests')).filter(n=>n.endsWith('.test.cjs')).map(n=>path.join('tests',n));
 await command(process.execPath,['--test',...tests]);
 const manifest=JSON.parse(await fs.readFile('.local/engine/manifest.json','utf8'));
 await command(path.resolve('.local/engine',manifest.php),['-n','tests/migration-format.php']);
 const electron=require('electron');
 await command(electron,['scripts/test-keychain.cjs']);await command(electron,['scripts/test-keychain.cjs','--read']);
 await command(electron,['scripts/test-project-transfers.cjs']);
 await command(process.execPath,['scripts/test-desktop-transfers.cjs']);
 await command(process.execPath,['scripts/test-migration.cjs']);
 await command(process.execPath,['scripts/test-mac-upgrade.cjs']);
 console.log('PRUEBAS MAC SUPERADAS. Evidencias locales: .local/mac-evidence');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
