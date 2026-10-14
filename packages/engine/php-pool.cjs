'use strict';
const http=require('node:http');
const {randomBytes}=require('node:crypto');
const {freePort,waitFor}=require('./process.cjs');
const {stopOwned}=require('./windows-native.cjs');

class PhpPool {
  constructor(engine,project){this.engine=engine;this.project=project;this.workers=[];this.server=null;this.stopping=false;}
  async start(){
    try {
      // Reserve the public endpoint before starting private workers. Never reuse a foreign listener.
      this.server=http.createServer((req,res)=>this.forward(req,res));
      this.server.requestTimeout=125000;this.server.headersTimeout=10000;
      await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(this.project.port,'127.0.0.1',()=>{this.server.off('error',reject);resolve();});});
      for(let i=0;i<4;i++){
        const port=await freePort(),token=randomBytes(24).toString('hex');
        const child=this.engine.launchPhp(this.project,port,token);
        const worker={port,child,pending:0};this.workers.push(worker);
        await waitFor(async()=>{
          if(child.exitCode!==null||child.signalCode)throw new Error('PHP no pudo iniciarse.');
          try{return await(await fetch(`http://127.0.0.1:${port}/.sitioo-health-${token}`,{signal:AbortSignal.timeout(1500)})).text()===token;}catch{return false;}
        },20000);
      }
    }catch(error){await this.stop();throw error.code==='EADDRINUSE'?new Error('El puerto del proyecto está ocupado por otra aplicación. No se ha cerrado ningún proceso ajeno.'):error;}
    return this;
  }
  forward(req,res){
    const allowed=new Set([`127.0.0.1:${this.project.port}`,`localhost:${this.project.port}`]);
    if(!allowed.has((req.headers.host||'').toLowerCase())){res.writeHead(403);res.end('Dirección local no permitida.');return;}
    const live=this.workers.filter(w=>w.child.exitCode===null&&!w.child.signalCode);
    if(this.stopping||!live.length){res.writeHead(503);res.end('El proyecto está iniciándose o detenido.');return;}
    const worker=live.reduce((a,b)=>a.pending<=b.pending?a:b);worker.pending++;
    let completed=false;
    const done=()=>{if(!completed){completed=true;worker.pending--;}};
    const upstream=http.request({host:'127.0.0.1',port:worker.port,path:req.url,method:req.method,headers:req.headers,timeout:120000},response=>{
      res.writeHead(response.statusCode,response.headers);response.pipe(res);response.on('end',done);response.on('error',done);
    });
    upstream.on('timeout',()=>upstream.destroy());
    upstream.on('error',()=>{done();if(!res.headersSent)res.writeHead(502);res.end('El componente web no respondió. Puedes detener e iniciar el proyecto.');});
    req.on('aborted',()=>upstream.destroy());res.on('close',done);req.pipe(upstream);
  }
  async stop(){
    if(this.stopping)return;this.stopping=true;
    if(this.server){
      await new Promise(resolve=>{const timer=setTimeout(()=>{this.server.closeAllConnections();resolve();},5000);this.server.close(()=>{clearTimeout(timer);resolve();});this.server.closeIdleConnections();});
    }
    await Promise.all(this.workers.map(w=>stopOwned(w.child)));
    this.workers=[];
  }
}
module.exports={PhpPool};
