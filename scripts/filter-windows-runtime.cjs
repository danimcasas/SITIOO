const fs=require('node:fs');const p=require('../package.json');const filter=p.build.win.extraResources.find(x=>x.to==='engine').filter;
const optional=['dev/**','lib/**','extras/**','php-cgi.exe','php-win.exe','phpdbg.exe','deplister.exe','php8phpdbg.dll','*.lib','glib-2.dll','gmodule-2.dll','gobject-2.dll','libenchant2.dll','libpq.dll','libsasl.dll','libsqlite3.dll','snapshot.txt','phar.phar.bat','pharcommand.phar'];
const keep=new Set(['mysqli','pdo_mysql','curl','openssl','mbstring','zip','gd','intl','fileinfo','sodium'].map(x=>'php_'+x+'.dll'));
for(const f of fs.readdirSync('.local/engine-windows-x64/php/ext'))if(!keep.has(f))optional.push('ext/'+f);
for(const f of optional)if(!filter.includes('!php/'+f))filter.push('!php/'+f);
p.scripts['test:windows']='node scripts/run-windows-tests.cjs';
fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
