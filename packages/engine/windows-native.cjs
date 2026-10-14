'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {run}=require('./process.cjs');

class WindowsNative {
  constructor(helper){this.helper=helper;}
  async secureDirectory(directory){
    await fs.mkdir(directory,{recursive:true});
    await run(this.helper,['secure-directory',path.resolve(directory)],{timeout:15000});
  }
  async verifyDirectory(directory){return run(this.helper,['check-directory',path.resolve(directory)],{timeout:15000});}
  async encrypt(value){
    try {return (await run(this.helper,['protect'],{input:Buffer.from(JSON.stringify(value)),binary:true,timeout:15000})).stdout;}
    catch{throw new Error('No se puede acceder al cifrado seguro de Windows. No se guardarán datos sin cifrar.');}
  }
  async decrypt(bytes){
    let plain;
    try {plain=(await run(this.helper,['unprotect'],{input:bytes,binary:true,timeout:15000})).stdout;return JSON.parse(plain.toString('utf8'));}
    catch{throw new Error('Windows no puede descifrar los datos de este proyecto con la cuenta actual. Los archivos se han conservado.');}
    finally{plain?.fill(0);}
  }
  async write(file,value){
    const encrypted=await this.encrypt(value);
    await this.secureDirectory(path.dirname(file));
    const temp=file+'.'+randomUUID()+'.tmp';
    await fs.writeFile(temp,encrypted,{flag:'wx'});
    await fs.rename(temp,file);
  }
}
async function stopOwned(child, timeout=10000){
  if(!child||child.exitCode!==null||child.signalCode)return;
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('No se pudo confirmar el cierre del componente de SITIOO.')),timeout);
    child.once('close',()=>{clearTimeout(timer);resolve();});
    // This is the ChildProcess handle returned by our own spawn. Its private Job closes its children.
    child.kill();
  });
}
async function waitOwnedExit(child,timeout=15000){
  if(!child||child.exitCode!==null||child.signalCode)return;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('La base de datos no terminó su cierre ordenado.')),timeout);child.once('close',()=>{clearTimeout(timer);resolve();});});
}
module.exports={WindowsNative,stopOwned,waitOwnedExit};
