const {contextBridge,ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('sitioo',Object.freeze({
  transferSelect:()=>ipcRenderer.invoke('sitioo:transfer-select'),
  transferCreate:data=>ipcRenderer.invoke('sitioo:transfer-create',data),
  dataFolder:()=>ipcRenderer.invoke('sitioo:data-folder'),
  pluginStatus:id=>ipcRenderer.invoke('sitioo:plugin-status',id),
  pluginInstall:id=>ipcRenderer.invoke('sitioo:plugin-install',id),
  backupsList:id=>ipcRenderer.invoke('sitioo:backups-list',id),
  backupsCreate:data=>ipcRenderer.invoke('sitioo:backups-create',data),
  backupsExport:data=>ipcRenderer.invoke('sitioo:backups-export',data),
  migrationPlugin:()=>ipcRenderer.invoke('sitioo:migration-plugin'),
  accessStatus:id=>ipcRenderer.invoke('sitioo:access-status',id),
  accessSave:data=>ipcRenderer.invoke('sitioo:access-save',data),
  accessReveal:id=>ipcRenderer.invoke('sitioo:access-reveal',id),
  accessCopy:data=>ipcRenderer.invoke('sitioo:access-copy',data),
  accessRemove:id=>ipcRenderer.invoke('sitioo:access-remove',id),
  info:() => ipcRenderer.invoke('sitioo:info'),
  list:() => ipcRenderer.invoke('sitioo:list'),
  create:data => ipcRenderer.invoke('sitioo:create',data),
  start:id => ipcRenderer.invoke('sitioo:start',id),
  stop:id => ipcRenderer.invoke('sitioo:stop',id),
  open:(id,admin) => ipcRenderer.invoke('sitioo:open',{id,admin}),
  onProgress:listener => { const fn = (_,data) => listener(data); ipcRenderer.on('sitioo:progress',fn); return () => ipcRenderer.removeListener('sitioo:progress',fn); }
}));
