'use strict';
const fs=require('node:fs/promises');const path=require('node:path');const {createHash,randomUUID}=require('node:crypto');const {stop}=require('../engine/process.cjs');
async function hashes(root){const result={};async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isSymbolicLink())throw new Error('El plugin contiene enlaces no admitidos.');if(item.isDirectory())await walk(file);else if(item.isFile())result[path.relative(root,file).split(path.sep).join('/')]=createHash('sha256').update(await fs.readFile(file)).digest('hex');}}await walk(root);return result;}
function same(a,b){const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&a[k]===b[k]);}
class PluginManager{
  constructor(engine,assets){this.engine=engine;this.assets=assets;engine.plugins=this;}
  directory(p){return path.join(this.engine.store.directory(p.id),'wordpress','wp-content','plugins','sitioo-migration');}
  async manifest(){return JSON.parse(await fs.readFile(path.join(this.assets,'plugin-manifest.json'),'utf8'));}
  async status(id){const p=this.engine.store.get(id),m=await this.manifest();let current;try{current=await hashes(this.directory(p));}catch(e){if(e.code==='ENOENT')return {state:'missing',version:null,target:m.version,allowed:true};throw e;}
    if(same(current,m.files))return {state:'current',version:m.version,target:m.version,allowed:true};
    for(const old of m.compatible||[])if(same(current,old.files))return {state:'update',version:old.version,target:m.version,allowed:true};
    return {state:'different',version:null,target:m.version,allowed:false,message:'La versión instalada es diferente o está modificada. Se conserva completa; revisa su compatibilidad antes de sustituirla.'};
  }
  async installNew(p){const state=await this.status(p.id);if(state.state!=='missing')throw new Error('El nuevo proyecto ya contiene un plugin diferente.');return this.replace(p,state);}
  async replace(p,state){
    if(!state.allowed)throw new Error(state.message);
    const web=path.join(this.engine.store.directory(p.id),'wordpress'),destination=this.directory(p),m=await this.manifest();
    if(state.state==='current'){await this.engine.wp(web,['plugin','activate','sitioo-migration']);return this.status(p.id);}
    const archive=path.join(this.engine.store.directory(p.id),'plugin-history',randomUUID());
    if(this.engine.native)await this.engine.native.secureDirectory(archive);else await fs.mkdir(archive,{recursive:true,mode:0o700});
    const staged=path.join(archive,'prepared'),previous=path.join(archive,'previous');
    await fs.cp(path.join(this.assets,'sitioo-migration'),staged,{recursive:true,errorOnExist:true,force:false});
    if(!same(await hashes(staged),m.files))throw new Error('El plugin incluido no coincide con su índice de integridad.');
    let moved=false,installed=false;
    try{
      await fs.mkdir(path.dirname(destination),{recursive:true});
      if(state.state!=='missing'){const fresh=await this.status(p.id);if(fresh.state!==state.state||!fresh.allowed)throw new Error('El plugin ha cambiado durante la operación.');await fs.rename(destination,previous);moved=true;}
      await fs.rename(staged,destination);installed=true;
      await this.engine.wp(web,['plugin','activate','sitioo-migration']);
      return this.status(p.id);
    }catch(e){if(installed)await fs.rename(destination,path.join(archive,'failed'));if(moved)await fs.rename(previous,destination);throw e;}
  }
  async install(id){return this.engine.exclusive(async()=>{const p=this.engine.store.get(id);if(p.status!=='stopped')throw new Error('El proyecto necesita recuperación.');const state=await this.status(id);if(!state.allowed)throw new Error(state.message);
    const active=this.engine.active.has(id);let suspended=false;
    try{if(active){const services=this.engine.active.get(id);await stop(services.http);services.http=null;suspended=true;}else await this.engine.database(p);return await this.replace(p,state);}
    finally{if(active&&suspended)await this.engine.http(p);else if(!active)await this.engine.stop(id);}
  });}
}
module.exports={PluginManager,hashes,same};
