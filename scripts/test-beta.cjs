const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {Store}=require('../packages/projects/store.cjs');
const {LocalEngine}=require('../packages/engine/local.cjs');
(async()=>{
const root=path.resolve('.local/beta-check');
const store=new Store(root);await store.load();
let engine=new LocalEngine(path.resolve(process.env.SITIOO_ENGINE||'.local/engine'),store,p=>console.log(p.message));
assert.equal(await engine.init(),true);new (require('../packages/migration/plugin-manager.cjs').PluginManager)(engine,path.resolve('.local/migration-assets'));
const password=crypto.randomBytes(24).toString('hex');
try{
 await engine.create({name:'Prueba de acceso',type:'wordpress',admin:'beta_admin',password});
 const first=store.items.at(-1),url=`http://127.0.0.1:${first.port}`;
 const anonymous=await fetch(url+'/wp-admin/',{redirect:'manual'});
 assert.equal(anonymous.status,302,'wp-admin debe exigir autenticación antes de mostrar el escritorio');
 assert.ok(new URL(anonymous.headers.get('location')).pathname.endsWith('/wp-login.php'));
 const login=await fetch(url+'/wp-login.php',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded','Cookie':'wordpress_test_cookie=WP%20Cookie%20check'},body:new URLSearchParams({log:'beta_admin',pwd:password,'wp-submit':'Acceder',redirect_to:url+'/wp-admin/',testcookie:'1'})});
 assert.equal(login.status,302);
 const cookies=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 assert.match(cookies,/wordpress_logged_in_/);
 const dashboard=await fetch(url+'/wp-admin/',{headers:{Cookie:cookies}});assert.equal(dashboard.status,200);const dashboardHtml=await dashboard.text();assert.match(dashboardHtml,/<body[^>]*class="wp-admin /);assert.match(dashboardHtml,/id="wpbody"/);assert.match(dashboardHtml,/id="dashboard-widgets-wrap"/);
 console.log('PASS autenticación real y escritorio en español');
 await engine.create({name:'Segundo proyecto',type:'wordpress',admin:'beta_admin',password});
 const second=store.items.at(-1);assert.notEqual(first.port,second.port);assert.notEqual(first.id,second.id);
 for(const project of [first,second]){const text=await(await fetch(`http://127.0.0.1:${project.port}`)).text();assert.ok(text.includes(project.name));}
 console.log('PASS dos proyectos independientes activos');
 await engine.close();
 const reopened=new Store(root);await reopened.load();
 engine=new LocalEngine(path.resolve(process.env.SITIOO_ENGINE||'.local/engine'),reopened,()=>{});await engine.init();await engine.start(first.id);
 assert.equal((await fetch(url)).status,200);console.log('PASS reapertura con datos persistentes');
 const before=(await engine.wp(path.join(root,first.id,'wordpress'),['post','list','--format=count'])).stdout.trim();assert.ok(Number(before)>0);console.log('PASS contenido conservado');
 console.log('BETA CHECK SUPERADO');
}finally{await engine.close();}
})().catch(error=>{console.error(error.message);if(error.diagnostic)console.error(error.diagnostic.replaceAll(path.resolve('.'),'[PROJECT]'));process.exitCode=1;});

