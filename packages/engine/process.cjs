'use strict';
const { spawn } = require('node:child_process');
const net = require('node:net');
function run(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    const {input,timeout=180000,binary=false,nativeHelper,...spawnOptions}=options;
    const child = spawn(nativeHelper||file,nativeHelper?['launch',file,...args]:args,{shell:false,windowsHide:true,...spawnOptions,stdio:['pipe','pipe','pipe']});
    let stdout = Buffer.alloc(0), stderr = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); }, timeout);
    child.stdout.on('data', b => { stdout = Buffer.concat([stdout,b]).subarray(-8*1024*1024); });
    child.stderr.on('data', b => { stderr = (stderr + b).slice(-100000); });
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve({stdout:binary?stdout:stdout.toString('utf8'),stderr}) : reject(Object.assign(new Error(`El componente ${require('node:path').basename(file)} no terminó correctamente (código ${code}).`),{diagnostic:stderr.replace(/[a-f0-9]{32,}/gi,'[redacted]')})); });
    child.stdin.on('error', () => {});
    child.stdin.end(input || '');
  });
}
async function freePort() {
  return new Promise((resolve,reject) => {
    const server = net.createServer();
    server.once('error',reject);
    server.listen(0,'127.0.0.1',() => { const port = server.address().port; server.close(e => e ? reject(e) : resolve(port)); });
  });
}
async function waitFor(check, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise(r => setTimeout(r,200));
  }
  throw new Error('El servidor no ha respondido a tiempo. Puedes volver a intentarlo.');
}
function stop(child) {
  if (child && typeof child.stop === 'function') return child.stop();
  if (!child || child.exitCode !== null || child.signalCode) return Promise.resolve();
  return new Promise(resolve => {
    const kill = signal => { try { process.kill(-child.pid,signal); } catch { try { child.kill(signal); } catch {} } };
    const timer = setTimeout(() => kill('SIGKILL'),10000);
    child.once('close',() => { clearTimeout(timer); resolve(); });
    kill('SIGTERM');
  });
}
module.exports = {run,freePort,waitFor,stop};
