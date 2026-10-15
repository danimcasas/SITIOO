'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {ProjectTransfers,inspectManifest,validateManifest}=require('../packages/projects/transfers.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function fixture(){
 const root=await fs.mkdtemp(path.resolve('.local/transfer-unit-')),source=path.join(root,'Copia á con espacios');await fs.mkdir(source);
 const bytes=Buffer.from('Paquete ficticio'),m={format:1,snapshot:1,wordpress:'7.1.3',source:{home:'http://127.0.0.1:19000',siteurl:'http://127.0.0.1:19000'},tables:{posts:{}},packages:[{name:'sitioo-0001-files.zip',kind:'files',bytes:bytes.length,sha256:hash(bytes),expanded:100,entries:1}]};
 const file=path.join(source,'sitioo-manifest.json');await fs.writeFile(file,JSON.stringify(m));await fs.writeFile(path.join(source,m.packages[0].name),bytes);
 return {root,source,file,m,bytes,transfers:new ProjectTransfers(path.join(root,'private'),{},null,'',()=>{})};
}
test('prepara una copia verificada independiente y conserva todos los bytes del origen',async()=>{
 const f=await fixture(),preview=await f.transfers.inspect(f.file),staged=await f.transfers.stage(f.file,preview.hash);
 assert.notEqual(staged.root,f.source);assert.deepEqual(await fs.readFile(path.join(staged.root,f.m.packages[0].name)),f.bytes);
 await fs.writeFile(path.join(staged.root,f.m.packages[0].name),'Cambio en la copia');assert.deepEqual(await fs.readFile(path.join(f.source,f.m.packages[0].name)),f.bytes);
});
test('rechaza paquetes corruptos aunque conserven el tamaño declarado',async()=>{
 const f=await fixture();await fs.writeFile(path.join(f.source,f.m.packages[0].name),Buffer.alloc(f.bytes.length));await assert.rejects(f.transfers.stage(f.file),/dañado/);
});
test('exige volver a seleccionar un índice que cambió tras la vista previa',async()=>{
 const f=await fixture(),preview=await f.transfers.inspect(f.file);f.m.snapshot=2;await fs.writeFile(f.file,JSON.stringify(f.m));await assert.rejects(f.transfers.stage(f.file,preview.hash),/cambió/);
});
test('rechaza un paquete ausente antes de crear un proyecto',async()=>{
 const f=await fixture();f.m.packages[0].name='sitioo-0002-files.zip';await fs.writeFile(f.file,JSON.stringify(f.m));await assert.rejects(inspectManifest(f.file),/Falta/);
});
test('rechaza rutas que escapan, nombres ambiguos y paquetes repetidos',async()=>{
 const f=await fixture();for(const name of ['../sitioo-0001-files.zip','C:\\sitioo-0001-files.zip','sitioo-0001-files.zip:ads','SITIOO-0001-files.zip']){
  const m=structuredClone(f.m);m.packages[0].name=name;assert.throws(()=>validateManifest(m),/paquetes/);
 }const m=structuredClone(f.m);m.packages.push(m.packages[0]);assert.throws(()=>validateManifest(m),/repetidos/);
});
test('rechaza formato futuro, tamaños excesivos y datos no numéricos',async()=>{
 const f=await fixture();for(const mutate of [m=>m.format=2,m=>m.packages[0].bytes=33554432,m=>m.packages[0].entries='1',m=>m.packages[0].expanded=16777217]){
  const m=structuredClone(f.m);mutate(m);assert.throws(()=>validateManifest(m));
 }
});
test('exige una versión de WordPress compatible antes de crear o importar',async()=>{
 const f=await fixture();f.transfers.engine.manifest={wordpressVersion:'7.1.3'};f.m.wordpress='7.2';await fs.writeFile(f.file,JSON.stringify(f.m));
 await assert.rejects(f.transfers.stage(f.file),/posterior/);
 f.m.wordpress='6.9.9';await fs.writeFile(f.file,JSON.stringify(f.m));await f.transfers.stage(f.file);
});
