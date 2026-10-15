 'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {spawn} = require('node:child_process');
const {randomBytes,createHash} = require('node:crypto');
const {run,freePort,waitFor,stop} = require('./process.cjs');
const {validateInput} = require('../projects/store.cjs');
const salt = () => randomBytes(32).toString('hex');
class LocalEngine {
  constructor(root,store,progress) { this.root=root;this.store=store;this.progress=progress;this.active=new Map();this.manifest=null;this.locked=false;this.guardian=null; }
  async init() {
    try {this.manifest=JSON.parse(await fs.readFile(path.join(this.root,'manifest.json'),'utf8'));}catch{ return false; }
    for(const key of ['php','database','client','installDb','wpCli','wordpress']) {
      const value=this.manifest[key];
      if(typeof value!=='string'||path.isAbsolute(value)||value.split(/[\\/]/).includes('..')) throw new Error('El manifiesto del motor no es válido.');
      this.manifest[key]=path.join(this.root,value);
      try {await fs.access(this.manifest[key]);} catch {this.manifest=null;return false;}
    }
    return true;
  }
  async exclusive(task) {if(this.locked)throw new Error('Espera a que termine la operación actual.');this.locked=true;try{return await task();}finally{this.locked=false;}}
  env() {return {...process.env,PHP_CLI_SERVER_WORKERS:'4',WP_CLI_CACHE_DIR:path.join(this.store.root,'.wp-cli-cache'),WP_CLI_CONFIG_PATH:path.join(this.root,'wp-cli.yml'),PHPRC:path.join(this.root,'php.ini'),PHP_INI_SCAN_DIR:path.join(this.root,'empty-ini'),SITIOO_CA_FILE:path.join(this.root,'cacert.pem')};}
  phpArgs() {return ['-n','-d','error_reporting=22527','-d','curl.cainfo='+path.join(this.root,'cacert.pem'),'-d','openssl.cafile='+path.join(this.root,'cacert.pem')];}
  async wp(directory,args,input,options={}) {return run(this.manifest.php,[...this.phpArgs(),path.relative(this.root,this.manifest.wpCli),'--path='+directory,...args],{input,env:{...this.env(),...options.env},cwd:this.root,timeout:options.timeout||180000});}
  async sql(socket,query) {return run(this.manifest.client,['--no-defaults','--protocol=socket','--socket='+socket,'--user=root'],{input:query});}
  launch(file,args,options={}) {
    if(!this.guardian){
      this.guardian=spawn(process.execPath,[path.join(this.root,'watchdog.cjs')],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},detached:true,stdio:['pipe','ignore','ignore']});
      this.guardian.stdin.on('error',()=>{});
    }
    const child=spawn(file,args,{shell:false,detached:true,stdio:'ignore',env:this.env(),...options});
    if(child.pid)this.guardian.stdin.write(JSON.stringify({action:'add',pid:child.pid})+'\n');
    child.on('close',()=>{try{process.kill(-child.pid,'SIGTERM');}catch{}this.guardian?.stdin.write(JSON.stringify({action:'remove',pid:child.pid})+'\n');});
    child.on('error',()=>{});return child;
  }
  socket(project) {
    let socket=path.join(this.store.root,'.sockets',project.id.slice(0,8)+'.sock');
    if(Buffer.byteLength(socket)>100){
      const namespace=createHash('sha256').update(path.resolve(this.store.root)).digest('hex').slice(0,12);
      socket=path.join(os.tmpdir(),'sitioo-'+namespace,project.id.replaceAll('-','').slice(0,16)+'.sock');
    }
    if(Buffer.byteLength(socket)>100)throw new Error('La carpeta temporal es demasiado larga para iniciar la base de datos.');
    return socket;
  }
  async database(project) {
    const dir=this.store.directory(project.id);
    const socket=this.socket(project);
    await fs.mkdir(path.dirname(socket),{recursive:true,mode:0o700});
    const socketDir=await fs.lstat(path.dirname(socket));
    if(socketDir.isSymbolicLink()||!socketDir.isDirectory()||socketDir.uid!==process.getuid()||(socketDir.mode&0o077)!==0)
      throw new Error('La carpeta de comunicación de la base de datos no tiene permisos privados.');
    const child=this.launch(this.manifest.database,['--no-defaults','--basedir='+path.dirname(path.dirname(this.manifest.database)),'--datadir='+path.join(dir,'database'),'--socket='+socket,'--pid-file='+path.join(dir,'db.pid'),'--skip-networking','--log-error='+path.join(dir,'database.log')]);
    this.active.set(project.id,{db:child});
    await waitFor(async()=>{try{await this.sql(socket,'SELECT 1;');return true;}catch{return false;}});
    return child;
  }
  async http(project) {
    const dir=this.store.directory(project.id),web=path.join(dir,'wordpress');
    const child=this.launch(this.manifest.php,[...this.phpArgs(),'-d','display_errors=0','-d','upload_max_filesize=64M','-d','post_max_size=64M','-d','memory_limit=256M','-S',`127.0.0.1:${project.port}`,'-t',web,path.join(this.root,'router.php')],{cwd:web});
    const services=this.active.get(project.id);services.http=child;
    await waitFor(async()=>{try{const response=await fetch(`http://127.0.0.1:${project.port}/wp-login.php`,{signal:AbortSignal.timeout(2000),redirect:'manual'});return response.status===200&&child.exitCode===null&&!child.signalCode;}catch{return false;}});
  }
  async create(input) {return this.exclusive(()=>this.createLocked(input));}
  async createLocked(input,options={}) {
    if(!this.locked)throw new Error('La creación requiere una operación exclusiva.');
    if(!this.manifest)throw new Error('Faltan los componentes del motor.');
    const data=validateInput(input);
    if(data.type!=='wordpress')throw new Error('WooCommerce todavía no está disponible en esta beta.');
    if(typeof input.admin!=='string'||! /^[A-Za-z0-9_.-]{3,32}$/.test(input.admin))throw new Error('Utiliza un usuario de 3 a 32 letras, números, puntos o guiones.');
    if(typeof input.password!=='string'||input.password.length<12||input.password.length>128||/[\r\n\0]/.test(input.password))throw new Error('Utiliza una contraseña de entre 12 y 128 caracteres, sin saltos de línea.');
    const p=await this.store.add(data,await freePort());
    const dir=this.store.directory(p.id),web=path.join(dir,'wordpress');
    const update=message=>this.progress({id:p.id,message});
    try {
      update('Preparando los archivos de WordPress…');
      await fs.mkdir(dir,{recursive:true,mode:0o700});
      await fs.cp(this.manifest.wordpress,web,{recursive:true});
      update('Creando tu base de datos independiente…');
      await run(this.manifest.installDb,['--no-defaults','--basedir='+path.dirname(path.dirname(this.manifest.database)),'--datadir='+path.join(dir,'database'),'--auth-root-authentication-method=normal','--skip-test-db']);
      await this.database(p);
      const dbPassword=salt();
      await this.sql(this.socket(p),`CREATE DATABASE sitioo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'sitioo'@'localhost' IDENTIFIED BY '${dbPassword}'; GRANT ALL ON sitioo.* TO 'sitioo'@'localhost';`);
      const values={DB_NAME:'sitioo',DB_USER:'sitioo',DB_PASSWORD:dbPassword,DB_HOST:'localhost:'+this.socket(p),DB_CHARSET:'utf8mb4',DB_COLLATE:''};
      for(const key of ['AUTH_KEY','SECURE_AUTH_KEY','LOGGED_IN_KEY','NONCE_KEY','AUTH_SALT','SECURE_AUTH_SALT','LOGGED_IN_SALT','NONCE_SALT'])values[key]=salt();
      const quote=value=>"'"+value.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";
      const config="<?php\n"+Object.entries(values).map(([k,v])=>`define('${k}', ${quote(v)});`).join('\n')+"\n$table_prefix = 'wp_';\ndefine('WP_DEBUG', false);\ndefine('WP_ENVIRONMENT_TYPE', 'local');\ndefine('FS_METHOD', 'direct');\nif (!defined('ABSPATH')) define('ABSPATH', __DIR__ . '/');\nrequire_once ABSPATH . 'wp-settings.php';\n";
      await fs.writeFile(path.join(web,'wp-config.php'),config,{mode:0o600});
      await fs.mkdir(path.join(web,'wp-content','mu-plugins'),{recursive:true});
      await fs.writeFile(path.join(web,'wp-content','mu-plugins','sitioo-local-mail.php'),"<?php\n/* Beta: prevent standard WordPress mail from leaving this computer. */\nadd_filter('pre_wp_mail', '__return_true');\n");
      update('Instalando WordPress y preparando tu administrador…');
      await this.wp(web,['core','install','--url=http://127.0.0.1:'+p.port,'--title='+p.name,'--admin_user='+input.admin,'--admin_email=admin@example.invalid','--skip-email','--prompt=admin_password'],input.password+'\n');
      for(const key of ['siteurl','home']) await this.wp(web,['option','update',key,'http://127.0.0.1:'+p.port]);
      await this.wp(web,['option','update','WPLANG','es_ES']);
      await this.wp(web,['rewrite','structure','/%postname%/']);
      if(!this.plugins)throw new Error('Faltan los recursos de SITIOO Migration.');
      await this.plugins.installNew(p);
      p.wpVersion=(await this.wp(web,['core','version'])).stdout.trim();
      if(options.prepare)await options.prepare(p,web);
      if(options.start===false)await this.stop(p.id);
      else {update('Comprobando que tu web responde…');await this.http(p);}
      p.status='stopped';await this.store.save();update('¡Tu web está lista!');return this.list();
    } catch(e) {await this.stop(p.id);p.status='error';await this.store.save();throw e;}
  }
  list() {return this.store.items.map(p=>({...p,status:this.active.has(p.id)?'running':p.status}));}
  async start(id) {return this.exclusive(async()=>{const p=this.store.get(id);if(p.status!=='stopped')throw new Error('El proyecto necesita recuperación.');if(this.active.has(id))return;try{await this.database(p);await this.http(p);}catch(e){await this.stop(id);throw e;}});}
  async stop(id) {this.store.get(id);const services=this.active.get(id);if(!services)return;await stop(services.http);await stop(services.db);this.active.delete(id);}
  async close() {for(const id of [...this.active.keys()])await this.stop(id);this.guardian?.stdin.end();this.guardian=null;}
}
module.exports={LocalEngine};
