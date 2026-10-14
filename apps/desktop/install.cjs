// The OS performs the copy only after an explicit choice in this dialog.
async function guideInstall(app,dialog,testProfile=false){
  if(process.platform!=='darwin'||!app.isPackaged||testProfile||app.isInApplicationsFolder())return true;
  const {response}=await dialog.showMessageBox({type:'info',title:'Instalar SITIOO',message:'Lleva SITIOO a Aplicaciones',detail:'Así podrás abrirlo siempre desde tu Mac. Pulsa «Instalar en Aplicaciones» y SITIOO se abrirá de nuevo cuando termine.',buttons:['Instalar en Aplicaciones','Probar sin instalar','Cancelar'],defaultId:0,cancelId:2,noLink:true});
  if(response===2){app.quit();return false;}
  if(response===1)return true;
  let conflict=false;
  try{
    const moved=app.moveToApplicationsFolder({conflictHandler:()=>{conflict=true;return false;}});
    if(moved)return false; // Electron quits and relaunches from Applications.
    await dialog.showMessageBox({type:'info',title:'SITIOO',message:conflict?'Ya hay una copia de SITIOO en Aplicaciones':'La instalación no se ha completado',detail:conflict?'La copia existente se ha conservado. Puedes abrirla desde Aplicaciones o sustituirla manualmente cuando lo decidas.':'Puedes volver a abrir el DMG y arrastrar SITIOO a Aplicaciones.',buttons:['Entendido']});
  }catch{
    await dialog.showMessageBox({type:'error',title:'SITIOO',message:'No hemos podido copiar SITIOO',detail:'Abre el DMG y arrastra el icono de SITIOO a Aplicaciones. Tus proyectos no se han modificado.',buttons:['Entendido']});
  }
  app.quit();return false;
}
module.exports={guideInstall};
