'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {randomBytes}=require('node:crypto');
const {run,freePort,waitFor}=require('./process.cjs');
const {WindowsNative,stopOwned,waitOwnedExit}=require('./windows-native.cjs');
const {PhpPool}=require('./php-pool.cjs');
const {validateInput}=require('../projects/store.cjs');
const keys=['AUTH_KEY','SECURE_AUTH_KEY','LOGGED_IN_KEY','NONCE_KEY','AUTH_SALT','SECURE_AUTH_SALT','LOGGED_IN_SALT','NONCE_SALT'];
const salt=()=>randomBytes(32).toString('hex');
class LocalEngine {
  constructor(root,store,progress=()=>{}){this.root=path.resolve(root);this.store=store;this.progress=progress;this.active=new Map();this.secrets=new Map();this.manifest=null;this.locked=false;}
  async init(){
    let m;try{m=JSON.parse(await fs.readFile(path.join(this.root,'manifest.json'),'utf8'));}catch{return false;}
    if(m.platform!=='win32'||m.arch!=='x64')throw new Error('Los componentes no corresponden a Windows x64.');
    for(const key of ['php','database','client','installDb','wpCli','wordpress','helper']){
      const value=m[key];if(typeof value!=='string'||path.isAbsolute(value)||value.split(/[\\/]/).includes('..'))throw new Error('El manifiesto del motor no es válido.');
      m[key]=path.join(this.root,value);try{await fs.access(m[key]);}catch{return false;}
    }
    this.manifest=m;this.native=new WindowsNative(m.helper);await this.native.secureDirectory(this.store.root);return true;
  }
  async exclusive(task){if(this.locked)throw new Error('Espera a que termine la operación actual.');this.locked=true;try{return await task();}finally{this.locked=false;}}
  secretFile(p){return path.join(this.store.root,'.secrets',p.id+'.enc');}
  async secret(p){
    if(this.secrets.has(p.id))return this.secrets.get(p.id);
    let bytes;try{bytes=await fs.readFile(this.secretFile(p));}catch{throw new Error('No se encuentran los datos cifrados del motor. Conserva la carpeta completa del proyecto para recuperarlo.');}
    const s=await this.native.decrypt(bytes);
    if(s.projectId!==p.id||![s.rootPassword,s.password,...keys.map(k=>s[k])].every(v=>/^[a-f0-9]{64}$/.test(v)))throw new Error('Los datos cifrados no corresponden a este proyecto.');
    this.secrets.set(p.id,s);return s;
  }
  env(p){
    const windows=process.env.SystemRoot||'C:\\Windows';
    const temp=p?path.join(this.store.directory(p.id),'tmp'):path.join(this.store.root,'.tmp');
    const e={SystemRoot:windows,WINDIR:windows,ComSpec:path.join(windows,'System32','cmd.exe'),PATH:[path.dirname(this.manifest.php),path.dirname(this.manifest.database),path.join(windows,'System32')].join(';'),TEMP:temp,TMP:temp,
      WP_CLI_CACHE_DIR:path.join(this.store.root,'.wp-cli-cache'),WP_CLI_CONFIG_PATH:path.join(this.root,'wp-cli.yml'),PHPRC:path.join(this.root,'php.ini'),PHP_INI_SCAN_DIR:path.join(this.root,'empty-ini'),SITIOO_CA_FILE:path.join(this.root,'cacert.pem'),SITIOO_PHP_EXT:path.join(path.dirname(this.manifest.php),'ext')};
    if(p){const s=this.secrets.get(p.id);if(!s)throw new Error('Primero debe abrirse el almacenamiento cifrado del proyecto.');e.SITIOO_DB_PASSWORD=s.password;e.SITIOO_DB_PORT=String(p.dbPort);e.SITIOO_PUBLIC_PORT=String(p.port);e.SITIOO_PRIVATE_DIR=path.join(this.store.directory(p.id),'migration-private');for(const k of keys)e['SITIOO_'+k]=s[k];}
    return e;
  }
  phpArgs(){return ['-c',path.join(this.root,'php.ini')];}
  projectFromDirectory(directory){const resolved=path.resolve(directory).toLowerCase();const p=this.store.items.find(p=>path.join(this.store.directory(p.id),'wordpress').toLowerCase()===resolved);if(!p)throw new Error('La carpeta no pertenece a un proyecto de SITIOO.');return p;}
  async wp(directory,args,input,options={}){const p=this.projectFromDirectory(directory);await this.secret(p);return run(this.manifest.php,[...this.phpArgs(),path.relative(this.root,this.manifest.wpCli),'--path='+directory,...args],{input,env:{...this.env(p),...options.env},cwd:this.root,nativeHelper:this.manifest.helper,timeout:options.timeout||180000});}
  async sql(p,query){const s=await this.secret(p);return run(this.manifest.php,[...this.phpArgs(),path.join(this.root,'control-db.php')],{input:query,env:{...this.env(p),SITIOO_DB_ROOT_PASSWORD:s.rootPassword},cwd:this.root,nativeHelper:this.manifest.helper,timeout:15000});}
  launch(file,args,env){const child=spawn(this.manifest.helper,['launch',file,...args],{shell:false,windowsHide:true,stdio:'ignore',env,cwd:this.root});child.on('error',()=>{});return child;}
  dbArgs(p){return ['--no-defaults','--basedir='+path.dirname(path.dirname(this.manifest.database)),'--datadir='+path.join(this.store.directory(p.id),'database')];}
  async database(p){
    if(this.active.has(p.id))return this.active.get(p.id).db;
    await this.secret(p);if(!Number.isInteger(p.dbPort)||p.dbPort<1024||p.dbPort>65535)throw new Error('El puerto privado del proyecto no es válido.');
    const child=this.launch(this.manifest.database,[...this.dbArgs(p),'--bind-address=127.0.0.1','--port='+p.dbPort,'--skip-name-resolve','--console','--max-connections=32'],this.env(p));
    this.active.set(p.id,{db:child});
    try{await waitFor(async()=>{if(child.exitCode!==null||child.signalCode)throw new Error('La base de datos no pudo arrancar. Comprueba que su puerto no esté ocupado.');try{await this.sql(p,'SELECT 1;');return true;}catch{return false;}},45000);}catch(e){await stopOwned(child);this.active.delete(p.id);throw e;}
    return child;
  }
  launchPhp(p,port,token){const web=path.join(this.store.directory(p.id),'wordpress');return this.launch(this.manifest.php,[...this.phpArgs(),'-S','127.0.0.1:'+port,'-t',web,path.join(this.root,'router.php')],{...this.env(p),SITIOO_HEALTH_TOKEN:token});}
  async http(p){const pool=new PhpPool(this,p);this.active.get(p.id).http=pool;await pool.start();}
  async create(input){return this.exclusive(()=>this.createLocked(input));}
  // Internal orchestration hook: never exposed through IPC. The caller owns the lock.
  async createLocked(input,options={}){
    if(!this.locked)throw new Error('La creación requiere una operación exclusiva.');
    if(!this.manifest)throw new Error('Faltan los componentes del motor.');const data=validateInput(input);
    if(data.type!=='wordpress')throw new Error('WooCommerce todavía no está disponible en esta beta.');
    if(typeof input.admin!=='string'||!/^[A-Za-z0-9_.-]{3,32}$/.test(input.admin))throw new Error('Utiliza un usuario de 3 a 32 letras, números, puntos o guiones.');
    if(typeof input.password!=='string'||input.password.length<12||input.password.length>128||/[\r\n\0]/.test(input.password))throw new Error('Utiliza una contraseña de entre 12 y 128 caracteres, sin saltos de línea.');
    const p=await this.store.add(data,await freePort());p.dbPort=await freePort();while(p.dbPort===p.port)p.dbPort=await freePort();await this.store.save();
    const dir=this.store.directory(p.id),web=path.join(dir,'wordpress'),update=message=>this.progress({id:p.id,message});
    try{
      update('Preparando el almacenamiento cifrado de Windows…');
      const s={projectId:p.id,rootPassword:salt(),password:salt()};for(const k of keys)s[k]=salt();await this.native.write(this.secretFile(p),s);this.secrets.set(p.id,s);
      for(const d of [dir,path.join(dir,'tmp'),path.join(dir,'migration-private')])await this.native.secureDirectory(d);
      update('Preparando los archivos de WordPress…');await fs.cp(this.manifest.wordpress,web,{recursive:true,errorOnExist:true,force:false});
      update('Creando tu base de datos independiente…');
      await run(this.manifest.installDb,['--datadir='+path.join(dir,'database'),'--port='+p.dbPort,'--silent'],{env:this.env(p),cwd:this.root,nativeHelper:this.manifest.helper});
      // Bootstrap never opens a network listener. Passwords travel only through stdin.
      const sql=`USE mysql;\nDELETE FROM global_priv WHERE User <> 'root' OR Host <> 'localhost';\nFLUSH PRIVILEGES;\nALTER USER 'root'@'localhost' IDENTIFIED BY '${s.rootPassword}';\nCREATE USER 'root'@'127.0.0.1' IDENTIFIED BY '${s.rootPassword}';\nGRANT ALL ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;\nCREATE DATABASE sitioo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nCREATE USER 'sitioo'@'127.0.0.1' IDENTIFIED BY '${s.password}';\nGRANT ALL ON sitioo.* TO 'sitioo'@'127.0.0.1';\nDROP DATABASE IF EXISTS test;\n`;
      await run(this.manifest.database,[...this.dbArgs(p),'--bootstrap','--skip-networking','--console'],{input:sql,env:this.env(p),cwd:this.root,nativeHelper:this.manifest.helper});
      await this.database(p);
      let config="<?php\n// Secrets are decrypted by SITIOO for this process only; no plaintext fallback.\n";
      config+="if (!getenv('SITIOO_DB_PASSWORD')) { http_response_code(503); exit('Inicia este proyecto desde SITIOO.'); }\n";
      config+="define('DB_NAME','sitioo');\ndefine('DB_USER','sitioo');\ndefine('DB_CHARSET','utf8mb4');\ndefine('DB_COLLATE','');\ndefine('DB_PASSWORD',getenv('SITIOO_DB_PASSWORD'));\ndefine('DB_HOST','127.0.0.1:'.getenv('SITIOO_DB_PORT'));\n";
      for(const k of keys)config+=`define('${k}',getenv('SITIOO_${k}'));\n`;
      config+="define('SITIOO_PRIVATE_DIR',getenv('SITIOO_PRIVATE_DIR'));\n$table_prefix='wp_';\ndefine('WP_DEBUG',false);\ndefine('WP_ENVIRONMENT_TYPE','local');\ndefine('FS_METHOD','direct');\nif(!defined('ABSPATH'))define('ABSPATH',__DIR__.'/');\nrequire_once ABSPATH.'wp-settings.php';\n";
      await fs.writeFile(path.join(web,'wp-config.php'),config,{flag:'wx'});
      await fs.mkdir(path.join(web,'wp-content','mu-plugins'),{recursive:true});await fs.writeFile(path.join(web,'wp-content','mu-plugins','sitioo-local-mail.php'),"<?php\n// Local beta: prevent standard WordPress email leaving this computer.\nadd_filter('pre_wp_mail','__return_true');\n",{flag:'wx'});
      update('Instalando WordPress y tu administrador…');
      await this.wp(web,['core','install','--url=http://127.0.0.1:'+p.port,'--title='+p.name,'--admin_user='+input.admin,'--admin_email=admin@example.invalid','--skip-email','--prompt=admin_password'],input.password+'\n');
      // WP's installation URL guess can incorporate a Windows path in CLI mode.
      for(const key of ['home','siteurl'])await this.wp(web,['option','update',key,'http://127.0.0.1:'+p.port]);
      await this.wp(web,['option','update','WPLANG','es_ES']);await this.wp(web,['option','update','permalink_structure','/%postname%/']);await this.wp(web,['eval','flush_rewrite_rules(false);']);
      if(!this.plugins)throw new Error('Faltan los recursos de SITIOO Migration.');update('Instalando y activando SITIOO Migration…');await this.plugins.installNew(p);
      p.wpVersion=(await this.wp(web,['core','version'])).stdout.trim();
      if(options.prepare)await options.prepare(p,web);
      if(options.start===false)await this.stop(p.id);
      else {update('Comprobando que tu web responde…');await this.http(p);}
      p.status='stopped';await this.store.save();update('Tu web está lista.');return this.list();
    }catch(e){try{await this.stop(p.id);}catch{}p.status='error';await this.store.save();throw e;}
  }
  list(){return this.store.items.map(p=>({...p,status:this.active.has(p.id)?'running':p.status}));}
  async start(id){return this.exclusive(async()=>{const p=this.store.get(id);if(p.status!=='stopped')throw new Error('El proyecto necesita recuperación.');if(this.active.has(id))return;try{await this.database(p);await this.http(p);}catch(e){await this.stop(id);throw e;}});}
  async stop(id){const p=this.store.get(id),services=this.active.get(id);if(!services)return;await services.http?.stop();if(services.db.exitCode===null&&!services.db.signalCode){await this.sql(p,'SHUTDOWN;');await waitOwnedExit(services.db);}this.active.delete(id);this.secrets.delete(id);}
  async close(){const results=await Promise.allSettled([...this.active.keys()].map(id=>this.stop(id)));this.secrets.clear();if(results.some(r=>r.status==='rejected'))throw new Error('No se pudo confirmar el cierre ordenado de todos los proyectos.');}
}
module.exports={LocalEngine};



