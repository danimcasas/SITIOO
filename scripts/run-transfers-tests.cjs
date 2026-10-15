'use strict';
const {spawn}=require('node:child_process'),path=require('node:path');
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(require('electron'),[path.resolve('scripts/test-project-transfers.cjs')],{stdio:'inherit',windowsHide:true,env});
child.on('close',code=>process.exitCode=code);child.on('error',()=>{console.error('No se pudo abrir Electron para las pruebas.');process.exitCode=1;});
