'use strict';
// Real renderer + preload + main IPC in a profile containing synthetic fixtures.
// The file picker is supplied a known fixture, avoiding desktop interaction.
if(!process.versions.electron){
 const {spawn}=require('node:child_process'),env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(require('electron'),[__filename],{stdio:'inherit',windowsHide:true,env});
 child.on('close',code=>process.exitCode=code);child.on('error',()=>{process.exitCode=1;});
}else{
 const {app,BrowserWindow,dialog}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
 const sync=require('node:fs'),dirs=sync.readdirSync(path.resolve('.local')).filter(n=>n.startsWith('Transferencias ficticias á ')).sort();
 if(!dirs.length)throw new Error('Ejecuta primero test:transfers:windows.');
 const profile=path.resolve('.local',dirs.at(-1)),output=path.resolve('../../pruebas/0.3.0-beta.1');
 process.env.SITIOO_DATA_DIR=profile;
 const exported=sync.readdirSync(profile).find(n=>n.startsWith('SITIOO-copia-'));
 if(!exported)throw new Error('No se encuentra la exportación ficticia.');
 dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path.join(profile,exported,'sitioo-manifest.json')]});
 const errors=[],results=[],pwd=crypto.randomBytes(24).toString('hex');
 let window;
 app.on('browser-window-created',(_,w)=>{window=w;w.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message);});});
 require('../apps/desktop/main.cjs');
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function until(fn,timeout=240000){const start=Date.now();while(Date.now()-start<timeout){const found=await fn();if(found)return found;await pause(200);}throw new Error('La interfaz no terminó a tiempo.');}
 const js=source=>window.webContents.executeJavaScript(source);
 const click=label=>js("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==="+JSON.stringify(label)+"&&!b.closest('[hidden]'));if(!b)throw new Error('Botón no encontrado');b.click();})()");
 async function screenshot(name){
  const layout=await js("({width:document.documentElement.scrollWidth,viewport:innerWidth,hiddenPassword:document.getElementById('admin-password').value===''})");
  assert.ok(layout.width<=layout.viewport,'Sin desbordamiento horizontal');assert.equal(layout.hiddenPassword,true);
  await fs.writeFile(path.join(output,name+'.png'),(await window.webContents.capturePage()).toPNG());
 }
 async function submit(name){
  await until(()=>js("!document.getElementById('wizard').hidden"));
  await js("document.getElementById('project-name').value="+JSON.stringify(name)+";document.getElementById('admin-user').value='ui_admin';document.getElementById('admin-password').value="+JSON.stringify(pwd)+";document.getElementById('remember-access').checked=true;document.getElementById('transfer-trusted').checked=true;document.getElementById('create-form').requestSubmit();");
  await until(()=>js("!document.getElementById('projects').hidden&&document.getElementById('notice').textContent.includes('Proyecto recuperado y detenido')"),300000);
  const card=await js("([...document.querySelectorAll('.card')].find(c=>c.querySelector('h3').textContent==="+JSON.stringify(name)+")?.textContent||'')");
  assert.ok(card.includes('Detenido'));assert.ok(card.includes('Acceso a WordPress'));
  assert.equal(await js("document.getElementById('admin-password').value"),'');
  results.push({name,status:'superada'});console.log('PASS interfaz: '+name);
 }
 app.whenReady().then(async()=>{
  await fs.mkdir(output,{recursive:true});
  await until(async()=>window&&!window.isDestroyed()&&await js("typeof window.sitioo==='object'&&document.querySelectorAll('.card').length>0").catch(()=>false));
  await js("localStorage.setItem('sitioo-welcome-seen','1');document.getElementById('welcome-later').click()");
  await pause(300);
  await screenshot('interfaz-proyectos-0.3');
  const countBefore=JSON.parse(await fs.readFile(path.join(profile,'projects/projects.json'))).length;
  await click('Duplicar proyecto');
  await screenshot('interfaz-duplicar-0.3');
  // Native browser validity must block an unacknowledged transfer.
  assert.equal(await js("document.getElementById('transfer-trusted').required"),true);
  await submit('Interfaz · duplicado á');
  await click('Copias y migración');
  await until(()=>js("!document.getElementById('backups').hidden&&document.querySelectorAll('#backup-history button').length>0"));
  await screenshot('interfaz-copias-0.3');
  await click('Recuperar como nuevo proyecto');await submit('Interfaz · recuperado á');
  await click('Importar copia');await until(()=>js("!document.getElementById('wizard').hidden"));
  await screenshot('interfaz-importar-0.3');await submit('Interfaz · importado á');
  const store=JSON.parse(await fs.readFile(path.join(profile,'projects/projects.json')));assert.equal(store.length,countBefore+3);
  assert.equal(errors.length,0,'Errores del renderer');
  window.setSize(760,680);await pause(300);await screenshot('interfaz-compacta-0.3');
  await fs.writeFile(path.join(output,'interfaz-'+Date.now()+'.json'),JSON.stringify({version:require('../package.json').version,environment:'Electron real, renderer aislado y canal IPC real, perfil ficticio Windows 11',results,errors:errors.length,nativePicker:'Selección controlada de un manifiesto ficticio; interacción manual con el diálogo no incluida'},null,2));
  console.log('INTERFAZ SUPERADA');app.quit();
 }).catch(async error=>{console.error(error.message);try{await fs.writeFile(path.join(output,'interfaz-fallo-'+Date.now()+'.json'),JSON.stringify({status:'fallida',message:error.message},null,2));}finally{app.exit(1);}});
}
