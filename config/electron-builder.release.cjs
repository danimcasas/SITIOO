const base=require('../package.json').build;
const signing=require('../scripts/apple-signing.cjs');
const {identity}=signing.configuration();
module.exports={...base,directories:{...base.directories,output:'dist-signed'},mac:{...base.mac,identity,hardenedRuntime:true,notarize:false},afterPack:signing.signEngine,afterSign:signing.notarizeApp};
