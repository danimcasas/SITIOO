const $ = id => document.getElementById(id);
let busy = false,accessId=null,revealTimer=null,backupId=null;
function clearAccess(){hideAccessPassword();clearTimeout(revealTimer);$('access-password').value='';$('access-password').type='password';$('access-user').value='';accessId=null;}

function screen(name) { if(name!=='access')clearAccess();for (const id of ['welcome','projects','wizard','progress','help','access','backups']) $(id).hidden = id !== name; }
function notice(message) { $('notice').textContent = message; $('notice').hidden = !message; }
async function call(task) { if (busy) return; busy = true; try { notice(''); await task(); } catch(e) { notice(e.message.replace(/^Error invoking remote method '[^']+': Error: /,'')); } finally { busy = false; } }
async function refresh() {
  const items = await window.sitioo.list(); $('cards').replaceChildren();
  if (!items.length) { const empty=document.createElement('div');empty.className='empty';const h=document.createElement('h3');h.textContent='Tu próximo proyecto empieza aquí';const p=document.createElement('p');p.textContent='Crea tu primera web y descubre todo lo que puedes hacer.';empty.append(h,p);$('cards').append(empty); }
  for(const p of items) {
    const card=document.createElement('article');card.className='card';
    const status=document.createElement('span');status.className='status '+p.status;status.textContent=({running:'● Activo',stopped:'○ Detenido',installing:'◌ Instalación incompleta',error:'! Requiere atención'})[p.status] || p.status;
    const title=document.createElement('h3');title.textContent=p.name;
    const info=document.createElement('p');info.textContent=`WordPress ${p.wpVersion || ''} · http://127.0.0.1:${p.port}`;
    const actions=document.createElement('div');actions.className='actions';
    const button=(label,fn,primary=false) => {const b=document.createElement('button');b.textContent=label;b.className=primary?'primary':'secondary';b.onclick=()=>call(async()=>{b.disabled=true;try{await fn();await refresh();}finally{b.disabled=false;}});actions.append(b);};
    if(p.status==='running'){button('Administrar WordPress',()=>window.sitioo.open(p.id,true),true);button('Abrir web',()=>window.sitioo.open(p.id,false));button('Detener',()=>window.sitioo.stop(p.id));}
    else if(p.status==='stopped')button('Iniciar proyecto',()=>window.sitioo.start(p.id),true);
    else {const warning=document.createElement('p');warning.textContent='La instalación no terminó. Sus archivos se conservan para diagnóstico.';actions.append(warning);}
    button('Acceso a WordPress',()=>showAccess(p));
    if(p.status==='running'||p.status==='stopped')button('Copias y migración',()=>showBackups(p));
    if(p.status==='running'||p.status==='stopped')button('SITIOO Migration',async()=>{const state=await window.sitioo.pluginStatus(p.id);if(!state.allowed){notice(state.message);return;}const result=await window.sitioo.pluginInstall(p.id);if(!result.cancelled)notice('SITIOO Migration '+result.version+' está instalado y activado.');});
    card.append(status,title,info,actions);$('cards').append(card);
  }
}
$('nav-home').onclick=()=>call(async()=>{screen('projects');await refresh();});
$('nav-help').onclick=()=>{if(!busy)screen('help');};
for(const id of ['nav-create','new-project'])$(id).onclick=()=>{if(!busy){notice('');screen('wizard');$('project-name').focus();}};
$('cancel').onclick=()=>{if(!busy)screen('projects');};
$('create-form').onsubmit=e=>{e.preventDefault();call(async()=>{screen('progress');try{const result=await window.sitioo.create({name:$('project-name').value,type:'wordpress',admin:$('admin-user').value,password:$('admin-password').value,saveAccess:$('remember-access').checked});$('create-form').reset();notice(result.accessWarning||'¡Tu web está lista! Pulsa «Administrar WordPress» para empezar.');}finally{$('admin-password').value='';screen('projects');await refresh();}});};
window.sitioo.onProgress(data=>{$('progress-text').textContent=data.message;});
call(async()=>{const info=await window.sitioo.info();$('brand').textContent=info.name;$('version').textContent=info.version;$('platform-badge').textContent=info.platform==='win32'?'BETA · WINDOWS':'BETA · MAC';$('app-icon').src=info.icon;await refresh();if(info.ready&&!localStorage.getItem('sitioo-welcome-seen'))screen('welcome');if(!info.ready)notice('Faltan componentes del motor. Esta copia todavía no puede crear WordPress.');});

for(const id of ['welcome-create','welcome-later'])$(id).onclick=()=>{if(busy)return;localStorage.setItem('sitioo-welcome-seen','1');screen(id==='welcome-create'?'wizard':'projects');if(id==='welcome-create')$('project-name').focus();};

function accessState(data){hideAccessPassword();$('access-state').textContent=data.locked?'No se puede leer el acceso guardado. Revisa el acceso seguro del sistema o introduce de nuevo usuario y contraseña.':data.saved?'Acceso guardado de forma cifrada en este equipo.':'Todavía no hay datos guardados. Introduce los que ya utilizas en WordPress.';$('access-user').value=data.username;$('access-password').value='';$('access-password').type='password';$('access-password').placeholder=data.saved&&!data.locked?'Guardada · deja vacío para conservarla':'Introduce tu contraseña actual';$('access-save').textContent=data.saved?'Actualizar acceso guardado':'Guardar acceso en este equipo';for(const id of ['access-reveal','access-copy-user','access-copy-password','access-remove'])$(id).disabled=!data.saved||(data.locked&&id!=='access-remove');$('access-save').disabled=!data.available;}
async function showAccess(project){clearAccess();const data=await window.sitioo.accessStatus(project.id);accessId=project.id;$('access-project').textContent=project.name;$('access-url').textContent=`Administrador: http://127.0.0.1:${project.port}/wp-admin/`;accessState(data);screen('access');if(!data.available)notice('El almacenamiento seguro no está disponible. No se guardarán contraseñas sin cifrar.');}
$('access-back').onclick=()=>{if(!busy){screen('projects');notice('');}};
$('access-form').onsubmit=event=>{event.preventDefault();call(async()=>{const data=await window.sitioo.accessSave({id:accessId,username:$('access-user').value,password:$('access-password').value});accessState(data);notice('Acceso guardado en este equipo. La contraseña de WordPress no se ha cambiado.');});};
$('access-reveal').onclick=()=>call(async()=>{if($('access-password').type==='text'){hideAccessPassword();return;}if($('access-password').value){notice('Guarda primero la nueva contraseña o vacía el campo para mostrar la guardada.');return;}const value=await window.sitioo.accessReveal(accessId);$('access-password').value=value;$('access-password').type='text';$('access-password').readOnly=true;$('access-reveal').textContent='Ocultar';revealTimer=setTimeout(hideAccessPassword,30000);});
function hideAccessPassword(){clearTimeout(revealTimer);if($('access-password').readOnly)$('access-password').value='';$('access-password').type='password';$('access-password').readOnly=false;$('access-reveal').textContent='Mostrar guardada';}
for(const [id,field] of [['access-copy-user','username'],['access-copy-password','password']])$(id).onclick=()=>call(async()=>{await window.sitioo.accessCopy({id:accessId,field});notice(field==='password'?'Contraseña copiada al portapapeles.':'Usuario copiado al portapapeles.');});
$('access-remove').onclick=()=>call(async()=>{const data=await window.sitioo.accessRemove(accessId);if(!data.cancelled){hideAccessPassword();accessState(data);notice('Se ha quitado la copia guardada. El acceso de WordPress sigue igual.');}});
window.addEventListener('blur',hideAccessPassword);

async function backupHistory(){const items=await window.sitioo.backupsList(backupId);$('backup-history').replaceChildren();if(!items.length){const p=document.createElement('p');p.textContent='Todavía no hay copias. La primera será la versión 1.';$('backup-history').append(p);}for(const item of items){const row=document.createElement('div');row.className='backup-row';const title=document.createElement('strong');title.textContent=`Versión ${item.version} · ${new Date(item.createdAt).toLocaleString('es-ES')}`;const info=document.createElement('p');info.textContent=`${item.note||'Copia completa'} · ${(item.bytes/1048576).toFixed(1)} MB · ${item.packages} paquetes`;const button=document.createElement('button');button.className='secondary';button.textContent='Exportar para producción';button.onclick=()=>call(async()=>{if(await window.sitioo.backupsExport({id:backupId,version:item.version}))notice('Paquetes y plugin exportados. Abre LEEME.md para seguir los pasos.');});row.append(title,info,button);$('backup-history').append(row);}}
async function showBackups(project){backupId=project.id;$('backup-project').textContent=project.name;$('backup-note').value='';await backupHistory();screen('backups');}
$('backup-back').onclick=()=>{if(!busy)screen('projects');};
$('backup-create').onclick=()=>call(async()=>{screen('progress');$('progress-text').textContent='Preparando la copia…';try{await window.sitioo.backupsCreate({id:backupId,note:$('backup-note').value});$('backup-note').value='';notice('Copia terminada. Ya puedes exportarla para producción.');}finally{screen('backups');await backupHistory();await refresh();}});
$('backup-plugin').onclick=()=>call(async()=>{if(await window.sitioo.migrationPlugin())notice('Plugin guardado. Instálalo en el WordPress de destino.');});



$('data-folder').onclick=()=>call(()=>window.sitioo.dataFolder());
