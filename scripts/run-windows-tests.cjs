const {spawn}=require('node:child_process');const path=require('node:path');
const electron=require('electron');const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const child=spawn(electron,[path.resolve('scripts/test-windows.cjs')],{stdio:'inherit',windowsHide:true,env});child.on('close',code=>process.exitCode=code);child.on('error',e=>{console.error(e.message);process.exitCode=1;});

