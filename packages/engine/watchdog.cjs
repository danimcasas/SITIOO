// Receives only process group IDs created by SITIOO. EOF means its parent exited.
const readline=require('node:readline');
const groups=new Set();
function kill(pid,signal){try{process.kill(-pid,signal);}catch{}}
const input=readline.createInterface({input:process.stdin});
input.on('line',line=>{try{const message=JSON.parse(line);if(!Number.isInteger(message.pid)||message.pid<2)return;if(message.action==='add')groups.add(message.pid);if(message.action==='remove')groups.delete(message.pid);}catch{}});
input.on('close',()=>{for(const pid of groups)kill(pid,'SIGTERM');if(!groups.size)return;setTimeout(()=>{for(const pid of groups)kill(pid,'SIGKILL');process.exit(0);},10000);});
