const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {Store}=require('../packages/projects/store.cjs');
const {LocalEngine}=require('../packages/engine/local.cjs');
(async()=>{
const root=path.resolve('.local/integration');
const store=new Store(root);await store.load();
const engine=new LocalEngine(path.resolve('.local/engine'),store,p=>console.log(p.message));
assert.equal(await engine.init(),true);
try{
  await engine.create({name:'Prueba beta',type:'wordpress',admin:'beta_admin',password:crypto.randomBytes(24).toString('hex')});
  const project=store.items.at(-1);
  const url=`http://127.0.0.1:${project.port}`;
  assert.equal((await fetch(url)).status,200);console.log('PASS página principal');
  assert.equal((await fetch(url+'/wp-login.php')).status,200);console.log('PASS acceso administrador');
  await engine.stop(project.id);
  await assert.rejects(fetch(url));console.log('PASS parada');
  await engine.start(project.id);
  assert.equal((await fetch(url)).status,200);console.log('PASS reinicio');
  const web=path.join(store.directory(project.id),'wordpress');
  await engine.wp(web,['plugin','install','hello-dolly','--activate']);console.log('PASS plugin oficial por HTTPS');
  await engine.wp(web,['theme','install','twentytwentyfour','--activate']);console.log('PASS tema oficial por HTTPS');
  await engine.wp(web,['core','verify-checksums','--locale=es_ES']);console.log('PASS verificación de WordPress');
  console.log('INTEGRACIÓN SUPERADA');
}finally{await engine.close();}
})().catch(error=>{console.error(error.message);if(error.diagnostic)console.error(error.diagnostic.replaceAll(path.resolve('.'),'[PROJECT]'));process.exitCode=1;});
