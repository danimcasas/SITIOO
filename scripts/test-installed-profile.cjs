'use strict';
// Ejecutar con Electron y la interfaz cerrada. Usa código y motor instalados.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {app,safeStorage}=require('electron');
const install=path.resolve(process.argv[2]),profile=path.resolve(process.argv[3]);
app.setPath('userData',profile);
const bundle=path.join(install,'resources/app.asar');
const {Store}=require(path.join(bundle,'packages/projects/store.cjs'));
const {LocalEngine}=require(path.join(bundle,'packages/engine/local.cjs'));
const {AccessVault}=require(path.join(bundle,'packages/access/vault.cjs'));
app.whenReady().then(async()=>{
 let engine;const results=[];
 try {
  const store=new Store(path.join(profile,'projects'));await store.load();
  const selected=store.items.filter(p=>!process.argv[4]||p.name.startsWith(process.argv[4]));assert.ok(selected.length>=Number(process.argv[5]||2));
  engine=new LocalEngine(path.join(install,'resources/engine'),store);assert.equal(await engine.init(),true);
  const vault=new AccessVault(path.join(profile,'access'),store,safeStorage,d=>engine.native.secureDirectory(d));
  for(const p of selected){
   const saved=await vault.read(p.id);if(!saved)continue;
   await engine.start(p.id);const url=`http://127.0.0.1:${p.port}`;
   const response=await fetch(url+'/wp-login.php',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(60000),headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:'wordpress_test_cookie=WP%20Cookie%20check'},body:new URLSearchParams({log:saved.username,pwd:saved.password,redirect_to:url+'/wp-admin/',testcookie:'1'})});
   assert.equal(response.status,302);const cookie=response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');assert.ok(cookie.includes('wordpress_logged_in'));
   const dashboard=await fetch(url+'/wp-admin/',{headers:{Cookie:cookie},signal:AbortSignal.timeout(60000)});assert.equal(dashboard.status,200);assert.match(await dashboard.text(),/wpadminbar/);
   results.push({test:'Inicio en wp-admin con acceso cifrado conservado',site:results.length+1,state:'superada'});
  }
  assert.ok(results.length>=Number(process.argv[5]||2));
  const web=path.join(store.directory(selected[0].id),'wordpress');
  if(process.env.SITIOO_SEED_MARKER==='1')await engine.wp(web,['option','update','sitioo_fictitious_marker','contenido ficticio único']);
  const marker=await engine.wp(web,['option','get','sitioo_fictitious_marker']);assert.equal(marker.stdout.trim(),'contenido ficticio único');
  results.push({test:'Dato ficticio previo conservado tras instalar',state:'superada'});
 } catch(e){results.push({test:'Validación instalada',state:'fallida',message:e.message});process.exitCode=1;}
 finally {await engine?.close();const report={version:'0.2.0-beta.2',date:new Date().toISOString(),code:'app.asar instalado',engine:'resources/engine instalado',results};await fs.writeFile(path.resolve('../../pruebas/beta.2/perfil-instalado-'+Date.now()+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(process.exitCode||0);}
});
