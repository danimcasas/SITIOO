'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Store}=require('../packages/projects/store.cjs'),{LocalEngine}=require('../packages/engine/mac.cjs'),{PluginManager}=require('../packages/migration/plugin-manager.cjs');
const {Backups}=require('../packages/backups/manager.cjs'),{ProjectTransfers}=require('../packages/projects/transfers.cjs');
(async()=>{
 assert.equal(process.platform,'darwin');
 const resources=path.resolve(process.argv[2]||'dist/0.3.0-beta.2/mac-arm64/SITIOO.app/Contents/Resources');
 const profile=path.resolve('.local/Prueba del DMG á '+Date.now()),store=new Store(path.join(profile,'projects'));await store.load();
 const engine=new LocalEngine(path.join(resources,'engine'),store,()=>{}),assets=path.join(resources,'migration'),checks=[];
 new PluginManager(engine,assets);assert.equal(await engine.init(),true);assert.equal(engine.manifest.wordpressVersion,'7.1.3');
 const password=crypto.randomBytes(24).toString('hex');
 const record=name=>{checks.push({name,status:'superada'});console.log('PASS '+name);};
 const wp=(p,args)=>engine.wp(path.join(store.directory(p.id),'wordpress'),['--skip-plugins','--skip-themes',...args]);
 async function login(p){
  const url='http://127.0.0.1:'+p.port,r=await fetch(url+'/wp-login.php',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:'wordpress_test_cookie=WP%20Cookie%20check'},body:new URLSearchParams({log:'bundle_admin',pwd:password,redirect_to:url+'/wp-admin/',testcookie:'1'})});
  assert.equal(r.status,302);const cookie=r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  const dashboard=await fetch(url+'/wp-admin/',{headers:{Cookie:cookie},redirect:'manual'});assert.equal(dashboard.status,200);assert.match(await dashboard.text(),/id="wpbody"/);
 }
 try{
  await engine.create({name:'Comprobación del DMG á',type:'wordpress',admin:'bundle_admin',password});const p=store.items.at(-1);
  await login(p);assert.equal((await engine.plugins.status(p.id)).state,'current');
  assert.ok(JSON.parse((await wp(p,['option','get','active_plugins','--format=json'])).stdout).includes('sitioo-migration/sitioo-migration.php'));
  record('Motor extraído del DMG: creación, WordPress 7.1.3, administrador y plugin activo');
  await wp(p,['option','update','sitioo_bundle_marker','Conservar á']);
  const backups=new Backups(path.join(profile,'backups'),engine,assets,()=>{}),transfers=new ProjectTransfers(path.join(profile,'transfers'),engine,backups,assets,()=>{});
  const copied=await transfers.run({kind:'duplicate',id:p.id},{name:'Duplicado del DMG',type:'wordpress',admin:'bundle_admin',password});
  const target=store.get(copied.projectId);assert.equal(engine.active.has(target.id),false);await engine.start(target.id);await login(target);
  assert.equal((await wp(target,['option','get','sitioo_bundle_marker'])).stdout.trim(),'Conservar á');
  record('Recursos del DMG: copia, duplicación e importador PHP, con acceso real al destino');
  await engine.close();await engine.start(target.id);await login(target);await engine.stop(target.id);
  record('Contenido persistente tras cerrar y reabrir el motor del DMG');
  for(const name of ['manual-app.html','manual-plugin.html','glosario-faq.html','manual.css'])await fs.access(path.join(resources,'manuals',name));
  record('Manuales y preguntas frecuentes incluidos en la aplicación');
 }finally{await engine.close();}
 await fs.mkdir('.local/mac-evidence',{recursive:true});await fs.writeFile('.local/mac-evidence/dmg-runtime.json',JSON.stringify({version:require('../package.json').version,platform:process.platform,date:new Date().toISOString(),checks},null,2));
})().catch(()=>{console.error('FAIL comprobación de recursos del DMG. Se conservan los sitios ficticios para revisar el resultado.');process.exitCode=1;});
