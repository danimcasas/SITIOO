'use strict';
// Run in Electron on the actual Mac or Windows host; only synthetic sites are created.
const {app,safeStorage}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {Store}=require('../packages/projects/store.cjs'),{LocalEngine}=require('../packages/engine/local.cjs');
const {PluginManager}=require('../packages/migration/plugin-manager.cjs'),{Backups}=require('../packages/backups/manager.cjs');
const {ProjectTransfers}=require('../packages/projects/transfers.cjs'),{AccessVault}=require('../packages/access/vault.cjs');
const isMac=process.platform==='darwin';
const profile=path.resolve('.local/Transferencias ficticias á '+Date.now()),report=path.join(path.resolve(process.env.SITIOO_TEST_REPORT_DIR||(isMac?'.local/mac-evidence':'../../pruebas/0.3.0-beta.1')),'transferencias-'+Date.now()+'.json');
require('node:fs').mkdirSync(profile,{recursive:true});app.setPath('userData',path.join(profile,'electron'));
const checks=[],record=(name)=>{checks.push({name,status:'superada'});console.log('PASS '+name);};
let engine,source,sourceVault,sourceSecret,sourceAccess;
const password=()=>crypto.randomBytes(24).toString('hex'),assets=path.resolve(process.env.SITIOO_MIGRATION_ASSETS||'.local/migration-assets');
const sourcePassword=password(),targetPassword=password(),ids=[];
function setup(store){engine=new LocalEngine(path.resolve(process.env.SITIOO_ENGINE||(isMac?'.local/engine':'.local/engine-windows-x64')),store,()=>{});new PluginManager(engine,assets);return engine;}
const wp=(p,args,input)=>engine.wp(path.join(engine.store.directory(p.id),'wordpress'),['--skip-plugins','--skip-themes',...args],input);
const value=async(p,key)=>(await wp(p,['option','get',key])).stdout.trim();
async function login(p,username,pwd){
 const url='http://127.0.0.1:'+p.port;
 const r=await fetch(url+'/wp-login.php',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:'wordpress_test_cookie=WP%20Cookie%20check'},body:new URLSearchParams({log:username,pwd,redirect_to:url+'/wp-admin/',testcookie:'1'})});
 assert.equal(r.status,302,'Inicio de sesión');const cookies=r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 assert.ok(cookies.includes('wordpress_logged_in_'));assert.equal((await fetch(url+'/wp-admin/',{headers:{Cookie:cookies},redirect:'manual'})).status,200);
}
app.whenReady().then(async()=>{
 assert.ok(['darwin','win32'].includes(process.platform));const store=new Store(path.join(profile,'projects'));await store.load();setup(store);assert.equal(await engine.init(),true);
 const backups=new Backups(path.join(profile,'backups'),engine,assets,()=>{}),transfers=new ProjectTransfers(path.join(profile,'transfers'),engine,backups,assets,()=>{});
 const vault=new AccessVault(path.join(profile,'access'),store,safeStorage,engine.native?d=>engine.native.secureDirectory(d):undefined);
 try{
  console.log('Preparando origen ficticio en el sistema actual…');
  await engine.create({name:'Origen ficticio á',type:'wordpress',admin:'source_admin',password:sourcePassword});source=store.items.at(-1);ids.push(source.id);
  assert.equal(await value(source,'home'),'http://127.0.0.1:'+source.port);
  assert.equal(await value(source,'siteurl'),'http://127.0.0.1:'+source.port);
  await vault.save(source.id,'source_admin',sourcePassword);sourceVault=await fs.readFile(vault.file(source.id));sourceSecret=await fs.readFile(engine.secretFile?engine.secretFile(source):path.join(store.directory(source.id),'wordpress/wp-config.php'));
  const web=path.join(store.directory(source.id),'wordpress'),upload=path.join(web,'wp-content/uploads/prueba.txt');
  await fs.mkdir(path.dirname(upload),{recursive:true});await fs.writeFile(upload,'Estado uno');
  const plugin=path.join(web,'wp-content/plugins/fixture-plugin');await fs.mkdir(plugin);
  await fs.writeFile(path.join(plugin,'fixture-plugin.php'),"<?php\n/* Plugin Name: Plugin ficticio de prueba */\n");
  await wp(source,['plugin','activate','fixture-plugin']);
  await wp(source,['eval',"update_option('sitioo_test_marker','estado_uno');update_option('sitioo_test_urls',['url'=>get_option('home').'/ejemplo','nested'=>serialize(['url'=>get_option('home').'/interior'])]);"]);
  await backups.create(source.id,'Estado anterior ficticio');
  await wp(source,['option','update','sitioo_test_marker','estado_dos']);await fs.writeFile(upload,'Estado dos');
  sourceAccess=await vault.read(source.id);
  async function transfer(request,name,expected){
    const result=await transfers.run(request,{name,type:'wordpress',admin:'new_admin',password:targetPassword});
    const p=store.get(result.projectId);ids.push(p.id);
    assert.equal(engine.active.has(p.id),false);assert.equal(p.status,'stopped');assert.notEqual(p.id,source.id);assert.notEqual(p.port,source.port);if(engine.native)assert.notEqual(p.dbPort,source.dbPort);else assert.notEqual(engine.socket(p),engine.socket(source));
    await vault.save(p.id,'new_admin',targetPassword);const saved=await fs.readFile(vault.file(p.id));assert.equal(saved.includes(Buffer.from(targetPassword)),false);
    await engine.start(p.id);assert.equal(await value(p,'sitioo_test_marker'),expected);
    assert.equal(await value(p,'home'),'http://127.0.0.1:'+p.port);
    assert.equal(await fs.readFile(path.join(store.directory(p.id),'wordpress/wp-content/uploads/prueba.txt'),'utf8'),expected==='estado_uno'?'Estado uno':'Estado dos');
    const active=JSON.parse((await wp(p,['option','get','active_plugins','--format=json'])).stdout);assert.deepEqual(active,['sitioo-migration/sitioo-migration.php']);
    assert.equal(await fs.readFile(path.join(store.directory(p.id),'wordpress/wp-content/plugins/fixture-plugin/fixture-plugin.php'),'utf8'),await fs.readFile(path.join(plugin,'fixture-plugin.php'),'utf8'));
    await wp(p,['eval',"$v=get_option('sitioo_test_urls');if($v['url']!==get_option('home').'/ejemplo'||unserialize($v['nested'])['url']!==get_option('home').'/interior')exit(19);"]);
    await login(p,'new_admin',targetPassword);await engine.stop(p.id);return p;
  }
  console.log('Duplicando el proyecto activo…');
  const duplicate=await transfer({kind:'duplicate',id:source.id},'Duplicado independiente á','estado_dos');
  assert.equal(engine.active.has(source.id),true);assert.equal(await value(source,'sitioo_test_marker'),'estado_dos');await login(source,'source_admin',sourcePassword);
  record('Duplicación de sitio activo: datos independientes, URL nueva, plugins conservados inactivos y nuevo administrador');
  console.log('Recuperando la primera copia…');
  await transfer({kind:'restore',id:source.id,version:1},'Recuperado de copia uno','estado_uno');
  assert.equal(await value(source,'sitioo_test_marker'),'estado_dos');assert.equal(await fs.readFile(upload,'utf8'),'Estado dos');
  record('Recuperación de una versión anterior como nuevo proyecto sin cambiar el original');
  const exported=await backups.export(source.id,1,profile);await engine.stop(source.id);
  const manifestPath=path.join(exported,'sitioo-manifest.json'),preview=await transfers.inspect(manifestPath);
  console.log('Importando los paquetes exportados…');
  await transfer({kind:'import',manifestPath,expectedHash:preview.hash},'Importado desde carpeta á','estado_uno');
  assert.equal(engine.active.has(source.id),false);
  record('Importación desde carpeta con espacios y acentos: paquetes verificados, enlaces serializados y acceso funcional');
  await engine.start(duplicate.id);await wp(duplicate,['option','update','sitioo_test_marker','solo_duplicado']);await engine.stop(duplicate.id);
  await engine.start(source.id);assert.equal(await value(source,'sitioo_test_marker'),'estado_dos');
  assert.deepEqual(await fs.readFile(vault.file(source.id)),sourceVault);assert.deepEqual(await fs.readFile(engine.secretFile?engine.secretFile(source):path.join(store.directory(source.id),'wordpress/wp-config.php')),sourceSecret);assert.deepEqual(await vault.read(source.id),sourceAccess);
  record('Cambios en el duplicado sin interferencia con datos ni accesos cifrados del original');
  // A real export from the preserved beta.2 adapter checks backwards format compatibility.
  const legacyAssets=path.resolve(process.env.SITIOO_LEGACY_ASSETS||'../SITIOO-signpath-2026-10-15/.local/migration-assets');
  const legacyVersion=process.env.SITIOO_LEGACY_VERSION||'0.2.0-beta.2';
  if(require('node:fs').existsSync(legacyAssets)){
    console.log('Comprobando formato anterior '+legacyVersion+'…');
    const legacyBackups=new Backups(path.join(profile,'legacy-backups'),engine,legacyAssets,()=>{});
    await legacyBackups.create(source.id,'Copia ficticia con exportador anterior');
    const legacyManifest=path.join(legacyBackups.directory(source.id),'v000001/sitioo-manifest.json');
    assert.equal(JSON.parse(await fs.readFile(legacyManifest)).appVersion,legacyVersion);
    await transfer({kind:'import',manifestPath:legacyManifest},'Importado de beta anterior','estado_dos');
    record('Importación de formato 1 generado por el exportador real '+legacyVersion);
  }else checks.push({name:'Exportador real anterior',status:'pendiente',reason:'No se encuentra la carpeta preservada de la beta anterior.'});
  const corrupt=path.join(profile,'Paquete dañado');await fs.cp(exported,corrupt,{recursive:true});
  const m=JSON.parse(await fs.readFile(path.join(corrupt,'sitioo-manifest.json'))),first=m.packages[0],bad=path.join(corrupt,first.name);
  await fs.writeFile(bad,Buffer.alloc(first.bytes));const count=store.items.length;
  await assert.rejects(transfers.run({kind:'import',manifestPath:path.join(corrupt,'sitioo-manifest.json')},{name:'Rechazado',type:'wordpress',admin:'new_admin',password:targetPassword}),/dañado/);assert.equal(store.items.length,count);
  record('Paquete alterado rechazado antes de crear un proyecto');
  // Valid outer checksum, invalid archive: failure must retain only the new failed destination.
  first.sha256=crypto.createHash('sha256').update(await fs.readFile(bad)).digest('hex');await fs.writeFile(path.join(corrupt,'sitioo-manifest.json'),JSON.stringify(m));
  await assert.rejects(transfers.run({kind:'import',manifestPath:path.join(corrupt,'sitioo-manifest.json')},{name:'Importación fallida conservada',type:'wordpress',admin:'new_admin',password:targetPassword}),/conservan/);
  const failed=store.items.at(-1);assert.equal(failed.status,'error');assert.equal(engine.active.has(failed.id),false);await fs.access(store.directory(failed.id));
  assert.equal(await value(source,'sitioo_test_marker'),'estado_dos');await login(source,'source_admin',sourcePassword);
  record('ZIP inválido conserva el destino incompleto, detiene sus procesos y mantiene utilizable el origen');
  await engine.close();assert.equal(engine.active.size,0);
  const reloaded=new Store(store.root);await reloaded.load();setup(reloaded);assert.equal(await engine.init(),true);
  const reopenedVault=new AccessVault(path.join(profile,'access'),reloaded,safeStorage,engine.native?d=>engine.native.secureDirectory(d):undefined);
  for(const id of ids){const p=reloaded.get(id),saved=await reopenedVault.read(id);await engine.start(id);await login(p,saved.username,saved.password);await engine.stop(id);}
  assert.equal(engine.active.size,0);
  record('Cierre y reapertura del motor con persistencia de proyectos, datos y accesos cifrados; todos los administradores accesibles');
  record('Inicio y parada de proyectos sin servidores gestionados pendientes');
 }finally{await engine.close();}
 await fs.mkdir(path.dirname(report),{recursive:true});await fs.writeFile(report,JSON.stringify({version:require('../package.json').version,platform:process.platform,arch:process.arch,os:require('node:os').release(),date:new Date().toISOString(),environment:isMac?'Mac Apple Silicon actual; datos ficticios; sin reiniciar macOS':'PC Windows 11 actual; datos ficticios; sin reiniciar Windows',checks},null,2));
 console.log('TRANSFERENCIAS SUPERADAS: '+checks.filter(x=>x.status==='superada').length);app.exit(0);
}).catch(async e=>{
 checks.push({name:'Ejecución de transferencias',status:'fallida',reason:e.message.replaceAll(profile,'[perfil de pruebas]')});console.error(e.stack);
 try{await engine?.close();await fs.mkdir(path.dirname(report),{recursive:true});await fs.writeFile(report,JSON.stringify({version:require('../package.json').version,checks},null,2));}finally{app.exit(1);}
});
