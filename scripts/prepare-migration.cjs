const fs=require('node:fs/promises');const path=require('node:path');const {run}=require('../packages/engine/process.cjs');const {hashes}=require('../packages/migration/plugin-manager.cjs');
(async()=>{
 const root=path.resolve('.local/migration-assets');await fs.mkdir(root,{recursive:true});
 const plugin=path.resolve('plugins/sitioo-migration');
 await fs.cp(plugin,path.join(root,'sitioo-migration'),{recursive:true});
 await fs.copyFile('packages/backups/export.php',path.join(root,'export.php'));await fs.copyFile('docs/MIGRACION.md',path.join(root,'MIGRACION.md'));
 const compatible=JSON.parse(await fs.readFile('config/plugin-compatible.json','utf8'));
 await fs.writeFile(path.join(root,'plugin-manifest.json'),JSON.stringify({version:require('../package.json').version,files:await hashes(plugin),compatible},null,2));
 const win=process.platform==='win32',engine=path.resolve(win?'.local/engine-windows-x64':'.local/engine');
 const manifest=JSON.parse(await fs.readFile(path.join(engine,'manifest.json'),'utf8'));
 const env={...process.env,SITIOO_PHP_EXT:path.join(engine,'php/ext'),SITIOO_CA_FILE:path.join(engine,'cacert.pem'),PHP_INI_SCAN_DIR:path.join(engine,'empty-ini')};
 await run(path.join(engine,manifest.php),[...(win?['-c',path.join(engine,'php.ini')]:['-n']),'-r',`$zip=new ZipArchive();if($zip->open($argv[1],ZipArchive::CREATE|ZipArchive::OVERWRITE)!==true)exit(1);$root=$argv[2];foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS)) as $f)if($f->isFile())$zip->addFile($f->getPathname(),'sitioo-migration/'.str_replace('\\\\','/',substr($f->getPathname(),strlen($root)+1)));if(!$zip->close())exit(1);`,path.join(root,'sitioo-migration.zip'),plugin],{env});
 console.log('Plugin y recursos de migración preparados.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
