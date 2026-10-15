'use strict';
const fs=require('node:fs/promises');
const {createReadStream,constants}=require('node:fs');
const path=require('node:path');
const {createHash,randomUUID}=require('node:crypto');
const {validateInput}=require('./store.cjs');
const MANIFEST='sitioo-manifest.json', MAX_MANIFEST=2097152, MAX_TOTAL=20*1024**3;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fileHash(file){const hash=createHash('sha256');for await(const bytes of createReadStream(file))hash.update(bytes);return hash.digest('hex');}
function validateManifest(m){
  if(!m||m.format!==1||!Number.isInteger(m.snapshot)||m.snapshot<1||m.snapshot>999999||
     !m.source||m.source.multisite||m.source.customUserTables||typeof m.wordpress!=='string'||
     !/^\d+\.\d+(?:\.\d+)?$/.test(m.wordpress)||!Array.isArray(m.packages)||
     !m.packages.length||m.packages.length>10000||!m.tables||typeof m.tables!=='object'||Array.isArray(m.tables))
    throw new Error('El índice no corresponde a una copia compatible de SITIOO.');
  const names=new Set();let total=0,bytes=0,entries=0;
  for(const key of ['home','siteurl']){
    try{const url=new URL(m.source[key]);if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.search||url.hash)throw new Error();}
    catch{throw new Error('La copia contiene una dirección de WordPress no válida.');}
  }
  for(const p of m.packages){
    if(!p||typeof p.name!=='string'||!/^sitioo-\d{4,}-(database|files)\.zip$/.test(p.name)||
       !['database','files'].includes(p.kind)||!p.name.endsWith('-'+p.kind+'.zip')||names.has(p.name)||
       !Number.isSafeInteger(p.bytes)||p.bytes<=0||p.bytes>=33554432||
       !Number.isSafeInteger(p.expanded)||p.expanded<0||p.expanded>16777216||
       !Number.isInteger(p.entries)||p.entries<1||p.entries>500||
       typeof p.sha256!=='string'||!/^[a-f0-9]{64}$/.test(p.sha256))
      throw new Error('El índice contiene paquetes no válidos o repetidos.');
    names.add(p.name);total+=p.bytes+p.expanded;bytes+=p.bytes;entries+=p.entries;
  }
  if(total>=MAX_TOTAL)throw new Error('La copia supera el límite de 20 GB de esta beta.');
  return {bytes,total,entries};
}
async function regularFile(file,max){
  let stat;try{stat=await fs.lstat(file);}catch{throw new Error('Falta un archivo de la copia. Conserva el índice y todos los ZIP juntos.');}
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>max)throw new Error('La copia contiene un archivo o enlace no admitido.');
  return stat;
}
async function inspectManifest(file){
  if(typeof file!=='string'||path.basename(file)!==MANIFEST)throw new Error('Selecciona sitioo-manifest.json dentro de la carpeta exportada.');
  await regularFile(file,MAX_MANIFEST);
  const raw=await fs.readFile(file);if(raw.length>MAX_MANIFEST)throw new Error('El índice es demasiado grande.');
  let manifest;try{manifest=JSON.parse(raw.toString('utf8'));}catch{throw new Error('No se puede leer el índice de la copia.');}
  const totals=validateManifest(manifest);
  for(const item of manifest.packages){const stat=await regularFile(path.join(path.dirname(file),item.name),item.bytes);if(stat.size!==item.bytes)throw new Error('Un paquete está incompleto. Vuelve a copiar todos los archivos de la exportación.');}
  return {manifest,raw,hash:digest(raw),...totals};
}
function validateDestination(input){
  const data=validateInput(input);
  if(data.type!=='wordpress'||typeof input.admin!=='string'||!/^[A-Za-z0-9_.-]{3,32}$/.test(input.admin)||
     typeof input.password!=='string'||input.password.length<12||input.password.length>128||/[\r\n\0]/.test(input.password))
    throw new Error('Indica un proyecto WordPress, un usuario válido y una contraseña de 12 a 128 caracteres.');
}
class ProjectTransfers {
  constructor(root,engine,backups,assets,progress=()=>{}){this.root=path.resolve(root);this.engine=engine;this.backups=backups;this.assets=assets;this.progress=progress;}
  async inspect(file){
    const value=await inspectManifest(file),m=value.manifest;
    return {hash:value.hash,snapshot:m.snapshot,createdAt:typeof m.createdAt==='string'?m.createdAt:'',
      wordpress:m.wordpress,packages:m.packages.length,bytes:value.bytes};
  }
  async stage(file,expectedHash){
    const info=await inspectManifest(file);
    if(expectedHash&&info.hash!==expectedHash)throw new Error('El índice cambió después de seleccionarlo. Selecciona la copia de nuevo.');
    const availableVersion=this.engine.manifest?.wordpressVersion;
    if(availableVersion){
      const source=info.manifest.wordpress.split('.').map(Number),target=availableVersion.split('.').map(Number);
      for(let i=0;i<3;i++){if((source[i]||0)>(target[i]||0))throw new Error('La copia necesita una versión de WordPress posterior a la incluida. Actualiza SITIOO antes de importarla.');if((source[i]||0)<(target[i]||0))break;}
    }
    const root=path.join(this.root,randomUUID());
    if(this.engine.native)await this.engine.native.secureDirectory(root);
    else await fs.mkdir(root,{recursive:true,mode:0o700});
    const available=await fs.statfs(root);
    if(available.bavail*available.bsize<info.total*3+104857600)throw new Error('No hay espacio suficiente para preparar y recuperar esta copia.');
    await fs.writeFile(path.join(root,MANIFEST),info.raw,{flag:'wx',mode:0o600});
    for(const [i,p] of info.manifest.packages.entries()){
      this.progress({message:'Comprobando paquete '+(i+1)+' de '+info.manifest.packages.length+'…'});
      const target=path.join(root,p.name);
      await fs.copyFile(path.join(path.dirname(file),p.name),target,constants.COPYFILE_EXCL);
      await fs.chmod(target,0o600);
      if((await fs.stat(target)).size!==p.bytes||await fileHash(target)!==p.sha256)
        throw new Error('Un paquete está dañado o ha cambiado. Se ha detenido la operación y se conserva el proyecto original.');
    }
    return {root,info};
  }
  async run(request,input){
    validateDestination(input);
    if(!request||!['duplicate','restore','import'].includes(request.kind))throw new Error('Operación de proyecto no válida.');
    return this.engine.exclusive(async()=>{
      let file,expectedHash=request.expectedHash,sourceId;
      if(request.kind==='import')file=request.manifestPath;
      else {
        const source=this.engine.store.get(request.id);sourceId=source.id;
        let version=request.version;
        if(request.kind==='duplicate'){
          const copies=await this.backups.createLocked(source.id,'Copia previa a duplicación');
          version=copies[0].version;
        }
        if(!Number.isInteger(version)||version<1||version>999999)throw new Error('Selecciona una copia válida del historial.');
        file=path.join(this.backups.directory(source.id),'v'+String(version).padStart(6,'0'),MANIFEST);
      }
      const staged=await this.stage(file,expectedHash);
      let createdId=null;
      try{
        const projects=await this.engine.createLocked(input,{start:false,prepare:async(p,web)=>{
          createdId=p.id;
          this.progress({message:'Recuperando contenido en el nuevo proyecto…'});
          const requestFile=path.join(this.engine.store.directory(p.id),'local-import.json');
          await fs.writeFile(requestFile,JSON.stringify({source:staged.root}),{flag:'wx',mode:0o600});
          const result=await this.engine.wp(web,['--skip-plugins','--skip-themes','--user='+input.admin,'eval-file',path.join(this.assets,'local-import.php'),requestFile],undefined,{
            env:{SITIOO_MIGRATION_LIB:path.join(this.assets,'sitioo-migration','includes'),
              SITIOO_PRIVATE_DIR:path.join(this.engine.store.directory(p.id),'migration-private')},timeout:1800000});
          if(!result.stdout.includes('SITIOO_LOCAL_IMPORT_OK'))throw new Error('La recuperación no terminó.');
          p.transfer={kind:request.kind,snapshot:staged.info.manifest.snapshot,completedAt:new Date().toISOString()};
          if(sourceId)p.transfer.sourceId=sourceId;
        }});
        this.progress({message:'Proyecto recuperado y detenido. Ya puedes revisar su acceso.'});
        return {projects,projectId:createdId};
      }catch{
        throw new Error('No se pudo completar el nuevo proyecto. Se conservan sus archivos para diagnóstico y el origen permanece intacto. Puedes repetir la operación con una copia compatible.');
      }
    });
  }
}
module.exports={ProjectTransfers,inspectManifest,validateManifest,fileHash};
