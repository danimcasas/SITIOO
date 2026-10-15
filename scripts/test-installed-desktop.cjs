'use strict';
// CDP is used only for this project's locally installed Electron test application.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {freePort}=require('../packages/engine/process.cjs');
(async()=>{
 const install=path.resolve(process.argv[2]),profile=path.resolve(process.argv[3]),output=path.resolve('../../pruebas/0.3.0-beta.1');
 const port=await freePort(),env={...process.env,SITIOO_DATA_DIR:profile};delete env.ELECTRON_RUN_AS_NODE;
 const exe=path.join(install,'SITIOO.exe');await fs.access(exe);
 const child=spawn(exe,['--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port],{windowsHide:true,stdio:'ignore',env});
 const ended=new Promise(resolve=>child.once('exit',resolve));let socket;
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const until=async(fn,ms=120000)=>{const end=Date.now()+ms;while(Date.now()<end){const r=await fn().catch(()=>null);if(r)return r;await pause(200);}throw new Error('No se pudo comprobar la aplicación instalada.');};
 try{
  const target=await until(async()=>{const targets=await (await fetch('http://127.0.0.1:'+port+'/json')).json();return targets.find(t=>t.type==='page'&&t.url.includes('app.asar'));});
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;const pending=new Map();
  socket.onmessage=event=>{const m=JSON.parse(event.data);if(pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(new Error('No se pudo evaluar la interfaz instalada.')):resolve(m.result);}};
  const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const js=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error('La interfaz instalada no completó la operación.');return r.result.value;};
  const info=await until(()=>js("window.sitioo&&window.sitioo.info()"));assert.equal(info.version,require('../package.json').version);assert.equal(info.ready,true);assert.equal(info.platform,'win32');
  await until(()=>js("document.querySelectorAll('.card').length>0"));await js("document.getElementById('welcome-later').click();document.getElementById('nav-home').click()");
  const buttons=await js("[...document.querySelectorAll('button')].map(b=>b.textContent)");assert.ok(buttons.includes('Duplicar proyecto'));assert.ok(buttons.includes('Importar copia'));
  const projects=await js("window.sitioo.list()"),selected=projects.filter(p=>p.name.startsWith('Interfaz ·'));assert.equal(selected.length,3);
  const results=[{name:'Apertura del ejecutable instalado, versión, motor incluido y botones nuevos',status:'superada'}];
  for(const p of selected){
   await js('window.sitioo.start('+JSON.stringify(p.id)+')');
   const access=await js('window.sitioo.accessStatus('+JSON.stringify(p.id)+')');assert.equal(access.saved,true);assert.equal(access.locked,undefined);
   let password=await js('window.sitioo.accessReveal('+JSON.stringify(p.id)+')');
   const url='http://127.0.0.1:'+p.port;
   const login=await fetch(url+'/wp-login.php',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Cookie:'wordpress_test_cookie=WP%20Cookie%20check'},body:new URLSearchParams({log:access.username,pwd:password,redirect_to:url+'/wp-admin/',testcookie:'1'})});password='';
   assert.equal(login.status,302);const cookies=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');assert.ok(cookies.includes('wordpress_logged_in'));
   assert.equal((await fetch(url+'/wp-admin/',{headers:{Cookie:cookies},redirect:'manual'})).status,200);
   await js('window.sitioo.stop('+JSON.stringify(p.id)+')');
   await assert.rejects(fetch(url,{signal:AbortSignal.timeout(1000)}));
   results.push({name:'Inicio, acceso cifrado a wp-admin y parada: '+p.name,status:'superada'});
  }
  await js("document.getElementById('nav-home').click()");await pause(300);
  const screenshot=await command('Page.captureScreenshot',{format:'png'});
  await fs.writeFile(path.join(output,'aplicacion-instalada-0.3.png'),Buffer.from(screenshot.data,'base64'));
  await fs.writeFile(path.join(output,'aplicacion-instalada-'+Date.now()+'.json'),JSON.stringify({version:info.version,environment:'SITIOO.exe instalado desde el EXE final; motor y app.asar instalados; perfil ficticio',results},null,2));
  console.log('APLICACIÓN INSTALADA SUPERADA: '+results.length);
  await js('window.close()').catch(()=>{});await Promise.race([ended,pause(20000).then(()=>{throw new Error('La aplicación instalada no confirmó el cierre.');})]);
 }finally{socket?.close();if(child.exitCode===null)throw new Error('La aplicación de prueba permanece abierta; revisa su cierre antes de continuar.');}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
