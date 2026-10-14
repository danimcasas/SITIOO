const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const c = require('../scripts/signpath/common.cjs');
function pe(){const b=Buffer.alloc(512);b.write('MZ');b.writeUInt32LE(128,60);b.write('PE\0\0',128);b.writeUInt16LE(0x20b,152);b[450]=99;return b;}
test('signing compares executable bytes while excluding only Authenticode fields',()=>{
 const original=pe(), signed=Buffer.concat([original,Buffer.alloc(16,7)]);
 signed.writeUInt32LE(77,216);signed.writeUInt32LE(512,296);signed.writeUInt32LE(16,300);
 assert.equal(c.samePayload(original,signed),true);
 signed[450]=1;assert.equal(c.samePayload(original,signed),false);
});
test('signing rejects non-PE files and malformed certificate locations',()=>{
 assert.throws(()=>c.samePayload(Buffer.from('private data'),pe()));
 const b=pe();b.writeUInt32LE(16,296);b.writeUInt32LE(496,300);
 assert.throws(()=>c.samePayload(pe(),b));
});
test('signing accepts only precise SITIOO paths; third parties and path traversal are refused',()=>{
 const previous=process.env.SITIOO_SIGNING_DIR;
 process.env.SITIOO_SIGNING_DIR=path.join(c.root,'.local','unit-signing');
 try{
  assert.equal(c.stageFor(path.join(c.workspace(),'build','win-unpacked','SITIOO.exe')),'application');
  assert.equal(c.stageFor(path.join(c.workspace(),'build',c.installerName)),'installer');
  for(const file of ['php.exe','mariadbd.exe','..\\SITIOO.exe','resources/SITIOO.exe'])assert.throws(()=>c.stageFor(path.join(c.workspace(),'build',file)));
  process.env.SITIOO_SIGNING_DIR=path.join(c.root,'..','unrelated');assert.throws(()=>c.workspace());
 }finally{if(previous===undefined)delete process.env.SITIOO_SIGNING_DIR;else process.env.SITIOO_SIGNING_DIR=previous;}
});
test('an absent or invalid mode cannot fall back to unsigned packaging',()=>{
 const previous=process.env.SITIOO_SIGNING_MODE;
 try{delete process.env.SITIOO_SIGNING_MODE;assert.throws(()=>c.mode());process.env.SITIOO_SIGNING_MODE='production';assert.throws(()=>c.mode());}
 finally{if(previous===undefined)delete process.env.SITIOO_SIGNING_MODE;else process.env.SITIOO_SIGNING_MODE=previous;}
});
