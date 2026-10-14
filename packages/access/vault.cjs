'use strict';
const fs=require('node:fs/promises');const path=require('node:path');const {randomUUID}=require('node:crypto');
class AccessVault {
 constructor(root,store,crypto,secureDirectory){this.root=root;this.store=store;this.crypto=crypto;this.secureDirectory=secureDirectory;this.queue=Promise.resolve();}
 file(id){this.store.get(id);this.store.directory(id);return path.join(this.root,id+'.enc');}
 async available(){try{return ['darwin','win32'].includes(process.platform)&&await this.crypto.isAsyncEncryptionAvailable();}catch{return false;}}
 async requireEncryption(){if(!await this.available())throw new Error('No se puede acceder al almacenamiento seguro del sistema. No se guardarán datos sin cifrar.');}
 async read(id){const file=this.file(id);let buffer;try{buffer=await fs.readFile(file);}catch(e){if(e.code==='ENOENT')return null;throw new Error('No se puede leer el acceso guardado.');}await this.requireEncryption();try{const value=await this.crypto.decryptStringAsync(buffer);const data=JSON.parse(value.result);if(data.projectId!==id||typeof data.username!=='string'||typeof data.password!=='string')throw new Error();return data;}catch{throw new Error('No se puede descifrar el acceso guardado. Comprueba que utilizas la misma cuenta del sistema.');}}
 async status(id){this.file(id);try{const data=await this.read(id);return {saved:Boolean(data),username:data?.username||'',available:await this.available()};}catch{return {saved:true,locked:true,username:'',available:await this.available()};}}
 save(id,username,password){return this.serial(async()=>{const file=this.file(id);await this.requireEncryption();if(typeof username!=='string'||!username.trim()||username.length>128||/[\r\n\0]/.test(username)||typeof password!=='string'||password.length>4096||/[\r\n\0]/.test(password))throw new Error('Revisa el usuario y la contraseña.');if(!password){const existing=await this.read(id);if(!existing)throw new Error('Introduce la contraseña que utilizas en WordPress.');password=existing.password;}
  let encrypted;try{encrypted=await this.crypto.encryptStringAsync(JSON.stringify({projectId:id,username:username.trim(),password}));}catch{throw new Error('No se pudo cifrar el acceso. No se ha guardado la contraseña.');}
  if(process.platform==='win32'){if(!this.secureDirectory)throw new Error('No se pudieron comprobar los permisos seguros de Windows.');await this.secureDirectory(this.root);}else await fs.mkdir(this.root,{recursive:true,mode:0o700});const temp=file+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,encrypted,{mode:0o600,flag:'wx'});await fs.rename(temp,file);return {saved:true,username:username.trim(),available:true};});}
 remove(id){return this.serial(async()=>{const file=this.file(id);try{await fs.unlink(file);}catch(e){if(e.code!=='ENOENT')throw new Error('No se pudo quitar el acceso guardado.');}return {saved:false,username:'',available:await this.available()};});}
 serial(task){const next=this.queue.then(task);this.queue=next.catch(()=>{});return next;}
}
module.exports={AccessVault};

