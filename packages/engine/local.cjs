'use strict';
module.exports=require(process.platform==='win32'?'./windows.cjs':'./mac.cjs');
