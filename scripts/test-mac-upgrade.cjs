'use strict';
// Uses an isolated site created by the preserved Mac beta, never a user's site.
if(!process.versions.electron){
 const {spawn}=require('node:child_process'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(require('electron'),[__filename],{stdio:'inherit',env});child.on('close',code=>process.exitCode=code);
}else{
 const {app,safeStorage}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
 const {Store}=require('../packages/projects/store.cjs'),{LocalEngine}=require('../packages/engine/mac.cjs');
 const {PluginManager}=require('../packages/migration/plugin-manager.cjs'),{AccessVault}=require('../packages/access/vault.cjs');
 const profile=path.resolve('.local/u'),evidence=path.resolve('.local/mac-evidence'),checks=[];
 require('node:fs').mkdirSync(profile,{recursive:true,mode:0o700});app.setPath('userData',path.join(profile,'electron'));
 let engine;const record=name=>{checks.push({name,status:'superada'});console.log('PASS '+name);};
 app.whenReady().then(async()=>{
  assert.equal(process.platform,'darwin');
  const legacyRoot=path.resolve(process.env.SITIOO_LEGACY_ROOT||'..');
  const legacyEntry=path.join(legacyRoot,'packages/engine/local.cjs');
  if(!require('node:fs').existsSync(legacyEntry)||!require('node:fs').existsSync(path.join(legacyRoot,'.local/engine/manifest.json'))){
   throw new Error('Falta la copia preservada de Mac para comprobar la actualización.');
  }
  const LegacyEngine=require(legacyEntry).LocalEngine,store=new Store(profile);await store.load();
  engine=new LegacyEngine(path.join(legacyRoot,'.local/engine'),store,()=>{});assert.equal(await engine.init(),true);
  const password=crypto.randomBytes(24).toString('hex');
  try{
   await engine.create({name:'Sitio ficticio beta anterior',type:'wordpress',admin:'legacy_admin',password});
   const p=store.items.at(-1),web=path.join(store.directory(p.id),'wordpress');
   const wp=(args,input)=>engine.wp(web,['--skip-plugins','--skip-themes',...args],input);
   await wp(['option','update','sitioo_legacy_marker','Conservar á']);
   await fs.cp(path.join(legacyRoot,'plugins/sitioo-migration'),path.join(web,'wp-content/plugins/sitioo-migration'),{recursive:true});
   await wp(['plugin','activate','sitioo-migration']);
   const vault=new AccessVault(path.join(profile,'access'),store,safeStorage);await vault.save(p.id,'legacy_admin',password);
   const beforeConfig=await fs.readFile(path.join(web,'wp-config.php')),beforeAccess=await fs.readFile(vault.file(p.id));
   await engine.close();
   const reloaded=new Store(profile);await reloaded.load();
   engine=new LocalEngine(path.resolve('.local/engine'),reloaded,()=>{});assert.equal(await engine.init(),true);
   const plugins=new PluginManager(engine,path.resolve('.local/migration-assets'));
   await engine.start(p.id);
   const url='http://127.0.0.1:'+p.port;
   async function login(){
    const login=await fetch(url+'/wp-login.php',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:'wordpress_test_cookie=WP%20Cookie%20check'},body:new URLSearchParams({log:'legacy_admin',pwd:password,redirect_to:url+'/wp-admin/',testcookie:'1'})});
    assert.equal(login.status,302);const cookies=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
    const dashboard=await fetch(url+'/wp-admin/',{headers:{Cookie:cookies},redirect:'manual'});assert.equal(dashboard.status,200);assert.match(await dashboard.text(),/id="wpbody"/);
   }
   await login();assert.equal((await wp(['option','get','sitioo_legacy_marker'])).stdout.trim(),'Conservar á');
   assert.deepEqual(await fs.readFile(path.join(web,'wp-config.php')),beforeConfig);
   const saved=await new AccessVault(path.join(profile,'access'),reloaded,safeStorage).read(p.id);assert.equal(saved.password,password);
   assert.deepEqual(await fs.readFile(vault.file(p.id)),beforeAccess);
   record('Sitio creado por la beta Mac anterior: contenido, configuración y acceso cifrado conservados con el motor nuevo');
   assert.equal((await plugins.status(p.id)).state,'update');
   await plugins.install(p.id);assert.equal((await plugins.status(p.id)).state,'current');
   await login();assert.equal(engine.active.has(p.id),true);
   const active=JSON.parse((await wp(['option','get','active_plugins','--format=json'])).stdout);assert.ok(active.includes('sitioo-migration/sitioo-migration.php'));
   const history=await fs.readdir(path.join(store.directory(p.id),'plugin-history'));assert.ok(history.length>0);
   record('Actualización del plugin beta.1 con conservación de su copia anterior, contenido y servidor activo');
   const entry=path.join(web,'wp-content/plugins/sitioo-migration/sitioo-migration.php'),original=await fs.readFile(entry);
   await fs.appendFile(entry,'\n// Cambio ficticio para comprobar conservación.\n');
   const modified=await fs.readFile(entry);assert.equal((await plugins.status(p.id)).state,'different');
   await assert.rejects(plugins.install(p.id),/diferente|modificada/);assert.deepEqual(await fs.readFile(entry),modified);
   await fs.writeFile(entry,original);await login();
   record('Plugin modificado rechazado sin sustituirlo ni alterar el acceso al sitio');
  }finally{await engine.close();}
  await fs.mkdir(evidence,{recursive:true});await fs.writeFile(path.join(evidence,'actualizacion-mac.json'),JSON.stringify({version:require('../package.json').version,platform:process.platform,date:new Date().toISOString(),checks},null,2));app.exit(0);
 }).catch(async()=>{console.error('FAIL actualización Mac: consulta las comprobaciones pendientes; no se muestran datos del sitio.');try{await engine?.close();}finally{app.exit(1);}});
}
