'use strict';
// Revisión visual de los HTML propios, sin acceder a sitios externos.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
app.disableHardwareAcceleration();app.on("window-all-closed",()=>{});app.whenReady().then(async()=>{try{for(const name of ['manual-app','manual-plugin','glosario-faq']){const w=new BrowserWindow({show:false,width:1050,height:850,webPreferences:{offscreen:true,nodeIntegration:false,contextIsolation:true,sandbox:true}});await w.loadFile(path.resolve('docs/'+name+'.html'));const state=await w.webContents.executeJavaScript('({title:document.title,width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,viewport:innerWidth,links:[...document.querySelectorAll("a[href]")].map(a=>a.getAttribute("href"))})');if(state.width>state.viewport)throw Error('Desbordamiento horizontal en '+name);const image=await w.webContents.capturePage();await fs.writeFile(path.resolve('../../pruebas/beta.2/'+name+'.png'),image.toPNG());console.log(JSON.stringify({file:name,...state}));w.destroy();}app.exit(0);}catch(e){console.error(e.message);app.exit(1);}});


