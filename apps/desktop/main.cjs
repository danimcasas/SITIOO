const {app,BrowserWindow,ipcMain,shell,safeStorage,clipboard,dialog} = require('electron');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {Store}=require('../../packages/projects/store.cjs');
const {LocalEngine}=require('../../packages/engine/local.cjs');
const {Backups}=require('../../packages/backups/manager.cjs');
const {PluginManager}=require('../../packages/migration/plugin-manager.cjs');
const {AccessVault}=require('../../packages/access/vault.cjs');
const brand=require('../../config/brand.json');
const dataOverride=process.env.SITIOO_DATA_DIR;
if(process.platform==='win32'&&app.isPackaged&&!dataOverride){const profile=path.join(app.getPath('appData'),'SITIOO');require('node:fs').mkdirSync(profile,{recursive:true});app.setPath('userData',profile);}
if(dataOverride||!app.isPackaged){const profile=dataOverride?path.resolve(dataOverride):path.resolve(__dirname,'../../.local/profile');require('node:fs').mkdirSync(profile,{recursive:true});app.setPath('userData',profile);}
let window,engine,ready=false,quitting=false;
if(!app.requestSingleInstanceLock()){app.quit();}else{
app.whenReady().then(async()=>{
  const canContinue=await require('./install.cjs').guideInstall(app,require('electron').dialog,Boolean(dataOverride));
  if(!canContinue)return;
  const root=(app.isPackaged||dataOverride)?path.join(app.getPath('userData'),'projects'):path.resolve(__dirname,'../../.local/projects');
  const store=new Store(root);await store.load();

  engine=new LocalEngine(app.isPackaged?path.join(process.resourcesPath,'engine'):path.resolve(__dirname,process.platform==='win32'?'../../.local/engine-windows-x64':'../../.local/engine'),store,data=>window?.webContents.send('sitioo:progress',data));
  ready=await engine.init();
  const vault=new AccessVault(path.join(app.getPath('userData'),'access'),store,safeStorage,engine.native?directory=>engine.native.secureDirectory(directory):undefined);
  const assets=app.isPackaged?path.join(process.resourcesPath,'migration'):path.resolve(__dirname,'../../.local/migration-assets');
  const plugins=new PluginManager(engine,assets);
  const backups=new Backups(path.join(app.getPath('userData'),'backups'),engine,assets,data=>window?.webContents.send('sitioo:progress',data));
  const entry=pathToFileURL(path.join(__dirname,'index.html')).href;
  const handle=(name,fn)=>ipcMain.handle('sitioo:'+name,async(event,arg)=>{
    if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||event.senderFrame.url!==entry)throw new Error('Operación no autorizada.');
    return fn(arg);
  });
  handle('info',()=>({...brand,ready,platform:process.platform}));handle('list',()=>engine.list());
  handle('data-folder',()=>shell.openPath(app.getPath('userData')));
  handle('create',async data=>{
    if(!ready)throw new Error('Faltan componentes del motor.');
    if(data?.saveAccess!==undefined&&typeof data.saveAccess!=='boolean')throw new Error('Opción de guardado no válida.');
    if(data?.saveAccess)await vault.requireEncryption();
    const before=new Set(store.items.map(p=>p.id));
    const projects=await engine.create(data);
    let accessWarning='';
    if(data.saveAccess){const created=store.items.find(p=>!before.has(p.id));try{await vault.save(created.id,data.admin,data.password);}catch{accessWarning='La web está lista, pero no se pudo guardar el acceso. Conserva tu contraseña y vuelve a guardarla desde «Acceso a WordPress».';}}
    return {projects,accessWarning};
  });
  handle('access-status',id=>vault.status(id));
  handle('access-save',data=>{if(!data||typeof data!=='object')throw new Error('Datos no válidos.');return vault.save(data.id,data.username,data.password);});
  handle('access-reveal',async id=>{const data=await vault.read(id);if(!data)throw new Error('Todavía no has guardado el acceso de este proyecto.');return data.password;});
  handle('access-copy',async data=>{if(!data||!['username','password'].includes(data.field))throw new Error('Acción no válida.');const saved=await vault.read(data.id);if(!saved)throw new Error('No hay un acceso guardado.');clipboard.writeText(saved[data.field]);return true;});
  handle('access-remove',async id=>{store.get(id);const choice=await dialog.showMessageBox(window,{type:'question',message:'¿Quitar el acceso guardado en este equipo?',detail:'No se cambia el usuario ni la contraseña de WordPress. Solo se elimina la copia que recuerda SITIOO.',buttons:['Cancelar','Quitar acceso'],defaultId:0,cancelId:0});if(choice.response!==1)return {cancelled:true};return vault.remove(id);});
  handle('backups-list',id=>backups.list(id));
  handle('backups-create',data=>{if(!data||typeof data!=='object')throw new Error('Datos no válidos.');return backups.create(data.id,data.note);});
  handle('backups-export',async data=>{store.get(data.id);const chosen=await dialog.showOpenDialog(window,{title:'Exportar copia para producción',properties:['openDirectory','createDirectory']});if(chosen.canceled)return null;const output=await backups.export(data.id,data.version,chosen.filePaths[0]);await shell.openPath(output);return true;});
  handle('migration-plugin',async()=>{const chosen=await dialog.showSaveDialog(window,{title:'Guardar SITIOO Migration',defaultPath:'sitioo-migration.zip',filters:[{name:'Plugin WordPress',extensions:['zip']}]});if(chosen.canceled)return false;await require('node:fs/promises').copyFile(path.join(assets,'sitioo-migration.zip'),chosen.filePath);shell.showItemInFolder(chosen.filePath);return true;});
  handle('plugin-status',id=>plugins.status(id));
  handle('plugin-install',async id=>{
    const state=await plugins.status(id);if(!state.allowed)throw new Error(state.message);
    const action=state.state==='missing'?'Instalar':state.state==='current'?'Activar':'Actualizar';
    const choice=await dialog.showMessageBox(window,{type:'question',message:action+' SITIOO Migration '+state.target,detail:'Se conservará el contenido del sitio y, si existe, una copia del plugin anterior. La web se pausará durante esta operación.',buttons:['Cancelar',action],defaultId:0,cancelId:0});
    if(choice.response!==1)return {cancelled:true};return plugins.install(id);
  });
  handle('start',id=>engine.start(id));handle('stop',id=>{if(engine.locked)throw new Error('Espera a que termine la operación actual.');return engine.stop(id);});
  handle('open',async data=>{if(!data||typeof data.admin!=='boolean')throw new Error('Acción no válida.');const p=store.get(data.id);if(!engine.active.has(p.id))throw new Error('Inicia primero el proyecto.');await shell.openExternal(`http://127.0.0.1:${p.port}/${data.admin?'wp-admin/':''}`);});
  window=new BrowserWindow({show:false,width:1120,height:800,minWidth:760,minHeight:600,title:brand.name,backgroundColor:'#f8f9fc',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  if(process.platform==='win32')window.removeMenu();
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_,__,callback)=>callback(false));
  await window.loadFile(path.join(__dirname,'index.html'));
  window.show();
}).catch(()=>{require('electron').dialog.showErrorBox('SITIOO','No se ha podido preparar la aplicación. Los datos existentes se han conservado.');app.quit();});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',event=>{if(!quitting&&engine){event.preventDefault();if(engine.locked){require('electron').dialog.showMessageBoxSync({message:'Espera a que termine la operación del proyecto antes de cerrar SITIOO.'});return;}quitting=true;engine.close().then(()=>app.quit()).catch(()=>{quitting=false;dialog.showErrorBox('SITIOO','No se ha podido confirmar el cierre ordenado de la base de datos. La aplicación permanece abierta para volver a intentarlo.');});}});
}



