const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run,freePort,waitFor}=require('../packages/engine/process.cjs');
const {LocalEngine}=require('../packages/engine/local.cjs');
test('pasa los argumentos literalmente sin ejecutar comandos del shell',async()=>{
  const value='$(echo no-ejecutar); & other';
  const result=await run(process.execPath,['-e','process.stdout.write(process.argv[1])',value]);
  assert.equal(result.stdout,value);
});
test('no incluye salida sensible de procesos en errores',async()=>{
  await assert.rejects(run(process.execPath,['-e',"process.stderr.write('sensitive-test-marker');process.exit(1)"]),error=>!error.message.includes('sensitive-test-marker'));
});
test('asigna un puerto local no privilegiado',async()=>{const port=await freePort();assert.ok(port>=1024&&port<=65535);});
test('espera una comprobación real de disponibilidad',async()=>{let calls=0;await waitFor(async()=>++calls===2,1000);assert.equal(calls,2);});
test('rechaza operaciones simultáneas',async()=>{const e=new LocalEngine('',{},()=>{});e.locked=true;await assert.rejects(e.exclusive(async()=>{}),/Espera/);});
test('acorta sockets de rutas largas y mantiene perfiles independientes',()=>{
  const MacEngine=require('../packages/engine/mac.cjs').LocalEngine;
  const project={id:'12345678-1234-1234-1234-123456789012'};
  const a=new MacEngine('',{root:'x'.repeat(120)},()=>{}),b=new MacEngine('',{root:'y'.repeat(120)},()=>{});
  assert.ok(Buffer.byteLength(a.socket(project))<=100);
  assert.equal(a.socket(project),a.socket(project));assert.notEqual(a.socket(project),b.socket(project));
});

