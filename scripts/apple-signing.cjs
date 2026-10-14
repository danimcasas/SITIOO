// Credentials stay in the macOS keychain. Never write them into this repository.
const fs=require('node:fs/promises');const path=require('node:path');const {execFile}=require('node:child_process');const {promisify}=require('node:util');
const execute=promisify(execFile);
function configuration(){
 const identity=process.env.CSC_NAME,profile=process.env.SITIOO_NOTARY_PROFILE;
 if(!identity||!profile)throw new Error('Configura CSC_NAME y SITIOO_NOTARY_PROFILE usando un certificado Developer ID y un perfil del llavero. No escribas contraseñas en archivos.');
 return {identity,profile};
}
async function command(file,args){try{return await execute(file,args,{maxBuffer:4*1024*1024});}catch{throw new Error(`La comprobación de Apple (${path.basename(file)}) no se completó. Revisa el certificado, el perfil del llavero y la licencia de Xcode.`);}}
async function signEngine(context){
 const {identity}=configuration();const root=path.join(context.appOutDir,'SITIOO.app/Contents/Resources/engine');
 async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){await walk(file);continue;}if(!item.isFile())continue;const handle=await fs.open(file,'r');const magic=Buffer.alloc(4);try{await handle.read(magic,0,4,0);}finally{await handle.close();}if(magic.equals(Buffer.from([0xcf,0xfa,0xed,0xfe])))await command('/usr/bin/codesign',['--force','--sign',identity,'--options','runtime','--timestamp',file]);}}
 await walk(root);
}
async function submit(file){const {profile}=configuration();const result=await command('/usr/bin/xcrun',['notarytool','submit',file,'--keychain-profile',profile,'--wait','--output-format','json']);if(JSON.parse(result.stdout).status!=='Accepted')throw new Error('Apple no ha aceptado este paquete. No se publicará como notarizado.');}
async function notarizeApp(context){
 const app=path.join(context.appOutDir,'SITIOO.app'),archive=path.join(context.appOutDir,'SITIOO-notary.zip');
 await command('/usr/bin/ditto',['-c','-k','--keepParent',app,archive]);await submit(archive);await command('/usr/bin/xcrun',['stapler','staple',app]);await command('/usr/bin/xcrun',['stapler','validate',app]);
}
async function notarizeDmg(file){const {identity}=configuration();await command('/usr/bin/codesign',['--force','--sign',identity,'--timestamp',file]);await submit(file);await command('/usr/bin/xcrun',['stapler','staple',file]);await command('/usr/bin/xcrun',['stapler','validate',file]);await command('/usr/bin/codesign',['--verify','--verbose=2',file]);}
module.exports={configuration,command,signEngine,notarizeApp,notarizeDmg};
