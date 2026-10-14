const {test}=require('node:test');const assert=require('node:assert/strict');
const {guideInstall}=require('../apps/desktop/install.cjs');
function fixture(responses=[]){let moves=0,quits=0;return {app:{isPackaged:true,isInApplicationsFolder:()=>false,moveToApplicationsFolder:()=>{moves++;return true;},quit:()=>quits++},dialog:{showMessageBox:async()=>({response:responses.shift()??0})},counts:()=>({moves,quits})};}
test('no propone instalación para un perfil de pruebas',async()=>{const f=fixture();assert.equal(await guideInstall(f.app,f.dialog,true),true);assert.equal(f.counts().moves,0);});
test('cancelar no copia ni inicia la aplicación',{skip:process.platform!=='darwin'},async()=>{const f=fixture([2]);assert.equal(await guideInstall(f.app,f.dialog),false);assert.deepEqual(f.counts(),{moves:0,quits:1});});
test('probar sin instalar no modifica Aplicaciones',{skip:process.platform!=='darwin'},async()=>{const f=fixture([1]);assert.equal(await guideInstall(f.app,f.dialog),true);assert.equal(f.counts().moves,0);});
test('instalación confirmada deja que Electron reinicie',{skip:process.platform!=='darwin'},async()=>{const f=fixture([0]);assert.equal(await guideInstall(f.app,f.dialog),false);assert.equal(f.counts().moves,1);});
test('protege una copia existente frente a sustitución automática',{skip:process.platform!=='darwin'},async()=>{const f=fixture([0]);f.app.moveToApplicationsFolder=options=>{assert.equal(options.conflictHandler(),false);return false;};assert.equal(await guideInstall(f.app,f.dialog),false);assert.equal(f.counts().quits,1);});
