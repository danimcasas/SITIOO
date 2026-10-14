const path=require('node:path');const fs=require('node:fs/promises');const crypto=require('node:crypto');
const signing=require('./apple-signing.cjs');
(async()=>{
 signing.configuration();
 await signing.command('/usr/bin/xcrun',['--find','notarytool']);
 const builder=require.resolve('electron-builder/cli.js');
 await signing.command(process.execPath,[builder,'--mac','dmg','--config','config/electron-builder.release.cjs']);
 const file=path.resolve('dist-signed',`SITIOO-${require('../package.json').version}-arm64.dmg`);
 await signing.notarizeDmg(file);
 const digest=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');await fs.writeFile(path.join(path.dirname(file),'SHA256SUMS.txt'),digest+'  '+path.basename(file)+'\n');
 console.log('Paquete firmado y notarizado validado en dist-signed.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
