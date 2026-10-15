'use strict';
// Compara todos los archivos de datos de un perfil ficticio antes/después
// del instalador. Ejecutar con SITIOO y los sitios cerrados.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createReadStream}=require('node:fs');
(async()=>{
 const profile=path.resolve(process.argv[2]),phase=process.argv[3];
 if(!['before-update','after-update','before-uninstall','after-uninstall'].includes(phase))throw Error('Fase no válida.');
 const rows={},files=[];
 async function walk(dir){const entries=await fs.readdir(dir,{withFileTypes:true});await Promise.all(entries.map(async f=>{const p=path.join(dir,f.name);if(f.isSymbolicLink())throw Error('Enlace inesperado.');if(f.isDirectory())await walk(p);else files.push(p);}));}
 for(const name of ['projects','access','backups','transfers']){const p=path.join(profile,name);try{await walk(p);}catch(e){if(e.code!=='ENOENT')throw e;}}
 for(const name of ['Local State','Preferences']){const p=path.join(profile,name);try{await fs.access(p);files.push(p);}catch(e){if(e.code!=='ENOENT')throw e;}}
 let next=0;
 await Promise.all(Array.from({length:12},async()=>{while(next<files.length){const p=files[next++],hash=crypto.createHash('sha256');for await(const bytes of createReadStream(p))hash.update(bytes);rows[path.relative(profile,p).replaceAll('\\','/')]=hash.digest('hex');}}));
 const base=path.join(profile,'preservation-'+phase.split('-')[1]+'.json');
 if(phase.startsWith('before'))await fs.writeFile(base,JSON.stringify(rows));
 else {const previous=JSON.parse(await fs.readFile(base));require('node:assert/strict').deepEqual(rows,previous);}
 const result={version:require('../package.json').version,date:new Date().toISOString(),phase,state:'superada',files:Object.keys(rows).length,description:phase.startsWith('after')?'Todos los archivos de sitios, bases y accesos mantienen sus hashes SHA-256.':'Referencia de datos ficticios preparada con todos los procesos cerrados.'};
 await fs.writeFile(path.resolve('../../pruebas/0.3.0-beta.1/conservacion-'+phase+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1;});

