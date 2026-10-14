<?php
namespace Sitioo;
require_once __DIR__.'/format.php';
function private_root() {
    $base=defined('SITIOO_PRIVATE_DIR')?SITIOO_PRIVATE_DIR:sys_get_temp_dir().'/sitioo-'.substr(hash('sha256',ABSPATH.AUTH_SALT),0,24);
    check(!is_link($base),'La carpeta privada no puede ser un enlace.');
    if(!is_dir($base))check(mkdir($base,0700,true),'El hosting necesita una carpeta privada con permiso de escritura.');
    $real=realpath($base);$public=realpath($_SERVER['DOCUMENT_ROOT']??ABSPATH)?:realpath(ABSPATH);
    check($real && !inside($real,$public) && !inside($real,realpath(ABSPATH)), 'Configura SITIOO_PRIVATE_DIR fuera de la carpeta pública del hosting.');
    chmod($base,0700);check((fileperms($base)&0077)===0 && is_writable($base),'La carpeta privada no tiene permisos seguros.');return $real;
}
function current_job() { $pointer=private_root().'/current.json';if(!is_file($pointer))return null;$id=json_read($pointer)['id'];check(preg_match('/^[a-f0-9]{16}$/D',$id),'Estado no válido.');return private_root().'/'.$id; }
function state_load() { $job=current_job();return $job?json_read($job.'/state.json'):null; }
function state_save($s) {json_write(current_job().'/state.json',$s);}
function manifest_validate($m) {
    global $wp_version,$wpdb;
    check(($m['format']??null)===FORMAT,'Formato de copia no compatible. Actualiza SITIOO Migration.');
    check(!is_multisite() && !defined('CUSTOM_USER_TABLE') && !defined('CUSTOM_USER_META_TABLE'),'Esta beta necesita WordPress individual con sus propias tablas de usuarios.');
    check(isset($m['wordpress']) && version_compare($wp_version,$m['wordpress'],'>='),'Actualiza WordPress en el hosting a la versión de la copia o una posterior.');
    foreach(['home','siteurl'] as $key){$url=$m['source'][$key]??'';$p=parse_url($url);check(is_string($url)&&strlen($url)<2048&&$p&&in_array($p['scheme']??'',['http','https'],true)&&!empty($p['host'])&&!isset($p['user'])&&!isset($p['pass'])&&!isset($p['query'])&&!isset($p['fragment']),'La copia tiene una dirección de origen no válida.');}
    identifier($m['source']['prefix']??'');check(is_string($m['source']['content']??null),'Falta la ruta del contenido.');
    check(count($m['tables']??[])>0 && count($m['tables'])<=500,'Número de tablas no compatible.');
    foreach(['posts','postmeta','options','users','usermeta','terms','term_taxonomy','term_relationships','termmeta','comments','commentmeta'] as $t)check(isset($m['tables'][$t]),'La copia no contiene todas las tablas de WordPress.');
    foreach($m['tables'] as $suffix=>$schema){identifier($suffix);check(strlen($suffix)<45 && is_int($schema['rows'])&&$schema['rows']>=0,'Tabla no válida.');create_table('sm_validate_'.$suffix,$schema,false);}
    $seen=[];$total=0;check(count($m['packages']??[])<=10000,'Demasiados paquetes.');
    foreach($m['packages'] as $p){check(preg_match('/^sitioo-\d{4,}-(database|files)\.zip$/D',$p['name']??''),'Nombre de paquete no válido.');check(!isset($seen[$p['name']]),'Paquete duplicado.');$seen[$p['name']]=true;check(in_array($p['kind'],['database','files'],true)&&is_int($p['bytes'])&&$p['bytes']>0&&$p['bytes']<33554432&&is_int($p['expanded'])&&$p['expanded']>=0&&$p['expanded']<=16777216&&is_int($p['entries'])&&$p['entries']>0&&$p['entries']<=500&&preg_match('/^[a-f0-9]{64}$/D',$p['sha256']),'Paquete no válido.');$total+=$p['bytes']+$p['expanded'];}
    check($total>0 && $total<21474836480,'Esta beta admite copias de hasta 20 GB.');$free=disk_free_space(private_root());check($free!==false && $free>$total*3+104857600,'No hay suficiente espacio libre para importar y conservar la recuperación.');
    check(disk_free_space(WP_CONTENT_DIR)>$total*2+104857600,'No hay espacio suficiente en el disco del contenido.');
    check(is_writable(WP_CONTENT_DIR) && !is_link(WP_CONTENT_DIR),'El contenido de WordPress debe ser una carpeta escribible sin enlaces.');return $m;
}
function job_begin($manifest) {
    $old=state_load();check(!$old || in_array($old['phase'],['complete','rolledback'],true),'Hay una migración pendiente. Continúala o recupera el destino antes de iniciar otra.');
    $m=manifest_validate($manifest);$id=bin2hex(random_bytes(8));$root=private_root().'/'.$id;check(mkdir($root,0700),'No se pudo crear la carpeta privada.');mkdir($root.'/packages',0700);mkdir($root.'/staged',0700);mkdir($root.'/originals',0700);json_write($root.'/manifest.json',$m);
    $user=wp_get_current_user();global $wpdb;$head=strtolower($wpdb->prefix[0])==='s'?'x':'s';foreach(table_names($wpdb->prefix) as $table)check(strlen(substr($table,strlen($wpdb->prefix)))<=53,'El prefijo de una tabla de destino no permite conservar su copia de recuperación.');
    $s=['id'=>$id,'owner'=>$user->user_login,'phase'=>'upload','uploaded'=>[],'verify'=>0,'table'=>0,'package'=>0,'entry'=>0,'files'=>[],'stage'=>$head.'m'.substr($id,0,8).'_','old'=>$head.'r'.substr($id,0,8).'_','journal'=>$head.'j'.$id,'prefix'=>$wpdb->prefix,'originalTables'=>[],'switched'=>false,'started'=>gmdate('c'),'destination'=>['home'=>get_option('home'),'siteurl'=>get_option('siteurl')],'snapshot'=>$m['snapshot']??0];
    json_write($root.'/state.json',$s);json_write(private_root().'/current.json',['id'=>$id]);return $s;
}
function upload_chunk(&$s,$name,$offset,$temp) {
    check($s['phase']==='upload','La subida ya está cerrada.');$m=json_read(current_job().'/manifest.json');$package=null;foreach($m['packages'] as $p)if($p['name']===$name)$package=$p;check($package!==null,'El archivo no pertenece a esta copia.');
    $size=filesize($temp);check($size>0&&$size<=1048576,'Fragmento de subida demasiado grande.');$file=current_job().'/packages/'.$name;$present=is_file($file)?filesize($file):0;
    if($offset<$present){$length=min($size,$present-$offset);$f=fopen($file,'rb');fseek($f,$offset);$bytes=fread($f,$length);fclose($f);$in=fopen($temp,'rb');$incoming=fread($in,$length);fclose($in);check(hash_equals(hash('sha256',$bytes),hash('sha256',$incoming)),'El fragmento repetido no coincide.');if($offset+$size<=$present){$s['uploaded'][$name]=$present;state_save($s);return;}$f=fopen($file,'c+b');check(ftruncate($f,$offset),'No se pudo reanudar el fragmento incompleto.');fclose($f);$present=$offset;}
    check($offset===$present&&$offset+$size<=$package['bytes'],'La posición de subida no coincide. Vuelve a seleccionar los mismos paquetes.');$out=fopen($file,'ab');$in=fopen($temp,'rb');check($out&&$in,'No se pudo abrir el fragmento.');check(stream_copy_to_stream($in,$out)===$size,'No se pudo guardar el fragmento.');fclose($in);fclose($out);chmod($file,0600);$s['uploaded'][$name]=$offset+$size;state_save($s);
}
function zip_index($p) {
    $zip=new \ZipArchive();check($zip->open(current_job().'/packages/'.$p['name'])===true,'ZIP dañado.');$stat=$zip->statName('index.json');check($stat&&$stat['size']<=2097152,'Índice ZIP no válido.');$entries=json_decode($zip->getFromName('index.json'),true,64,JSON_THROW_ON_ERROR);check(is_array($entries)&&count($entries)===$p['entries']&&$zip->numFiles===count($entries)+1,'El ZIP contiene archivos no declarados.');return [$zip,$entries];
}
function target_file($relative,$mkdir=false) {
    content_path($relative);$path=rtrim(WP_CONTENT_DIR,'/');$parts=explode('/',$relative);foreach($parts as $i=>$part){$path.='/'.$part;check(!is_link($path),'Un archivo de destino es un enlace simbólico.');if($i<count($parts)-1){check(!file_exists($path)||is_dir($path),'Una carpeta de destino está ocupada por un archivo.');if($mkdir&&!is_dir($path))check(mkdir($path,0755),'No se pudo crear una carpeta del contenido.');}}check(!is_dir($path),'Un archivo de destino está ocupado por una carpeta.');return $path;
}
function verify_package($p,$m,&$s) {
    $file=current_job().'/packages/'.$p['name'];check(is_file($file)&&filesize($file)===$p['bytes']&&hash_equals($p['sha256'],hash_file('sha256',$file)),'Falta un paquete o su comprobación de integridad no coincide.');
    [$zip,$entries]=zip_index($p);$bytes=0;$seen=[];
    foreach($entries as $e){check(preg_match('/^data\/\d{6}$/D',$e['entry']??'')&&!isset($seen[$e['entry']]),'Entrada ZIP no válida.');$seen[$e['entry']]=true;$stat=$zip->statName($e['entry']);check($stat&&is_int($e['bytes'])&&$stat['size']===$e['bytes']&&$e['bytes']>=0&&$e['bytes']<=PART_BYTES&&preg_match('/^[a-f0-9]{64}$/D',$e['sha256']),'Tamaño de entrada no válido.');$bytes+=$e['bytes'];$zip->getExternalAttributesName($e['entry'],$os,$attr);check((($attr>>16)&0170000)!==0120000,'El ZIP contiene enlaces.');
        if($p['kind']==='files'){target_file($e['path']);check(is_int($e['offset'])&&is_int($e['total'])&&$e['offset']>=0&&$e['total']>=0&&$e['total']<=2147483647&&$e['offset']+$e['bytes']<=$e['total'],'Bloque de archivo no válido.');$previous=$s['fileProgress'][$e['path']]??['offset'=>0,'total'=>$e['total'],'done'=>false];check(!$previous['done']&&$previous['offset']===$e['offset']&&$previous['total']===$e['total'],'Falta un fragmento o un archivo está repetido.');$s['fileProgress'][$e['path']]=['offset'=>$e['offset']+$e['bytes'],'total'=>$e['total'],'done'=>$e['offset']+$e['bytes']===$e['total']];}
        else check(isset($m['tables'][$e['table']??''])&&is_int($e['rows'])&&$e['rows']>0&&$e['rows']<=100,'Bloque de datos no válido.');
        $data=$zip->getFromName($e['entry']);check(is_string($data)&&hash_equals($e['sha256'],hash('sha256',$data)),'Contenido de un paquete dañado.');
    }$zip->close();check($bytes===$p['expanded'],'Tamaño expandido no válido.');
}
function import_rows($s,$m,$e,$data,$key) {
    global $wpdb;$marker=$s['journal'];$done=$wpdb->get_var($wpdb->prepare('SELECT entry_key FROM '.identifier($marker).' WHERE entry_key=%s',$key));if($done)return;
    $schema=$m['tables'][$e['table']];$columns=array_column($schema['columns'],'name');$map=[$m['source']['siteurl']=>$s['destination']['siteurl'],$m['source']['home']=>$s['destination']['home'],$m['source']['content']=>WP_CONTENT_DIR];uksort($map,fn($a,$b)=>strlen($b)-strlen($a));
    $lines=explode("\n",rtrim($data,"\n"));check(count($lines)===$e['rows'],'Bloque de filas incompleto.');query('START TRANSACTION');try{foreach($lines as $line){$row=json_decode($line,true,64,JSON_THROW_ON_ERROR);check(array_keys($row)===$columns,'Las columnas no coinciden.');$values=[];foreach($row as $column=>$value){if($value===null){$values[]='NULL';continue;}$raw=base64_decode($value,true);check($raw!==false,'Dato codificado no válido.');if($column!=='guid')$raw=replace_value($raw,$map);if(($e['table']==='usermeta'&&$column==='meta_key')||($e['table']==='options'&&$column==='option_name')){if(strpos($raw,$m['source']['prefix'])===0)$raw=$s['prefix'].substr($raw,strlen($m['source']['prefix']));}$values[]="X'".bin2hex($raw)."'";}query('INSERT INTO '.identifier($s['stage'].$e['table']).' ('.implode(',',array_map(__NAMESPACE__.'\\identifier',$columns)).') VALUES ('.implode(',',$values).')');}query($wpdb->prepare('INSERT INTO '.identifier($marker).' (entry_key) VALUES (%s)',$key));query('COMMIT');}catch(\Throwable $e){query('ROLLBACK');throw $e;}
}
function stage_file(&$s,$e,$data) {
    $relative=$e['path'];$staged=current_job().'/staged/'.$relative;$parent=dirname($staged);if(!is_dir($parent))check(mkdir($parent,0700,true),'No se pudo preparar el contenido.');$out=fopen($staged,'c+b');check($out!==false,'No se pudo preparar el archivo.');check(fstat($out)['size']>=$e['offset'],'Falta un fragmento anterior del archivo.');ftruncate($out,$e['offset']);fseek($out,$e['offset']);check(fwrite($out,$data)===strlen($data),'No se pudo guardar el contenido.');fclose($out);
    if($e['offset']+$e['bytes']!==$e['total'])return;
    $dest=target_file($relative,true);$backup=current_job().'/originals/'.$relative;
    if(!array_key_exists($relative,$s['files'])){if(is_file($dest)){if(!is_dir(dirname($backup)))check(mkdir(dirname($backup),0700,true),'No se pudo preparar la recuperación.');check(copy($dest,$backup),'No se pudo conservar el archivo anterior.');chmod($backup,0600);}$s['files'][$relative]=is_file($dest)?['mode'=>fileperms($dest)&0777,'mtime'=>filemtime($dest)]:null;state_save($s);}
    $tmp=$dest.'.sitioo-'.$s['id'];check(!is_link($tmp),'Ruta temporal no válida.');check(copy($staged,$tmp),'No hay espacio para publicar el archivo.');chmod($tmp,0644);check(rename($tmp,$dest),'No se pudo publicar el archivo.');if(function_exists('opcache_invalidate'))@opcache_invalidate($dest,true);
}
function preserve_admin($s) {
    global $wpdb;$user=wp_get_current_user();$users=identifier($s['stage'].'users');$meta=identifier($s['stage'].'usermeta');$id=$wpdb->get_var($wpdb->prepare("SELECT ID FROM $users WHERE user_login=%s",$user->user_login));$record=$wpdb->get_row($wpdb->prepare('SELECT * FROM '.identifier($wpdb->users).' WHERE ID=%d',$user->ID),ARRAY_A);check($record,'No se pudo conservar el administrador.');
    if(!$id)$id=1+(int)$wpdb->get_var("SELECT MAX(ID) FROM $users");$record['ID']=$id;$values=[];foreach($record as $v)$values[]=$v===null?'NULL':"X'".bin2hex($v)."'";query('REPLACE INTO '.$users.' ('.implode(',',array_map(__NAMESPACE__.'\\identifier',array_keys($record))).') VALUES ('.implode(',',$values).')');query("DELETE FROM $meta WHERE user_id=".(int)$id);
    $items=$wpdb->get_results($wpdb->prepare('SELECT meta_key,meta_value FROM '.identifier($wpdb->usermeta).' WHERE user_id=%d',$user->ID),ARRAY_A);foreach($items as $item)query($wpdb->prepare("INSERT INTO $meta (user_id,meta_key,meta_value) VALUES (%d,%s,%s)",$id,$item['meta_key'],$item['meta_value']));return (int)$id;
}
function stage_option($s,$key,$value) {global $wpdb;query($wpdb->prepare('INSERT INTO '.identifier($s['stage'].'options').' (option_name,option_value,autoload) VALUES (%s,%s,%s) ON DUPLICATE KEY UPDATE option_value=VALUES(option_value)',$key,maybe_serialize($value),'auto'));}
function switch_tables(&$s,$m) {
    global $wpdb;
    if($s['switched'])return;
    // Atomic RENAME may have succeeded immediately before a lost HTTP response.
    if($s['originalTables'] && in_array($s['old'].$s['originalTables'][0],table_names($s['old']),true)){$s['switched']=true;state_save($s);wp_cache_flush();return;}
    foreach($m['tables'] as $suffix=>$schema){$count=$wpdb->get_var('SELECT COUNT(*) FROM '.identifier($s['stage'].$suffix));check((int)$count===$schema['rows'],'El número de filas importadas no coincide.');}
    $s['adminId']=preserve_admin($s);
    $roles=array_option($wpdb->get_var($wpdb->prepare('SELECT option_value FROM '.identifier($s['stage'].'options').' WHERE option_name=%s',$s['prefix'].'user_roles')));check(is_array($roles),'Las funciones de usuario de la copia no son válidas.');foreach(wp_get_current_user()->roles as $role)if(isset(wp_roles()->roles[$role]))$roles[$role]=wp_roles()->roles[$role];stage_option($s,$s['prefix'].'user_roles',$roles);
    foreach(['home','siteurl'] as $key)stage_option($s,$key,$s['destination'][$key]);
    $options=identifier($s['stage'].'options');$s['sourcePlugins']=array_option($wpdb->get_var("SELECT option_value FROM $options WHERE option_name='active_plugins'"));
    stage_option($s,'active_plugins',['sitioo-migration/sitioo-migration.php']);stage_option($s,'admin_email',get_option('admin_email'));stage_option($s,'blog_public',get_option('blog_public'));stage_option($s,'upload_path','');stage_option($s,'upload_url_path','');stage_option($s,'cron',[]);
    $s['sourceTheme']=$wpdb->get_var("SELECT option_value FROM $options WHERE option_name='stylesheet'");
    foreach(['stylesheet','template'] as $key){$theme=$wpdb->get_var($wpdb->prepare("SELECT option_value FROM $options WHERE option_name=%s",$key));check(is_string($theme)&&strpos($theme,'/')===false,'El tema de la copia no es válido.');$style=target_file('themes/'.$theme.'/style.css');check(is_file($style),'Faltan archivos del tema. Recupera el destino y revisa la copia.');}
    $s['originalTables']=array_map(fn($t)=>substr($t,strlen($wpdb->prefix)),table_names($wpdb->prefix));state_save($s);
    $renames=[];foreach($s['originalTables'] as $suffix)$renames[]=identifier($wpdb->prefix.$suffix).' TO '.identifier($s['old'].$suffix);foreach($m['tables'] as $suffix=>$schema)$renames[]=identifier($s['stage'].$suffix).' TO '.identifier($wpdb->prefix.$suffix);query('RENAME TABLE '.implode(',',$renames));$s['switched']=true;state_save($s);wp_cache_flush();wp_set_current_user($s['adminId']);
}
function job_step(&$s) {
    $m=json_read(current_job().'/manifest.json');
    if($s['phase']==='upload'){foreach($m['packages'] as $p)check(($s['uploaded'][$p['name']]??0)===$p['bytes'],'Selecciona y sube todos los ZIP de la copia antes de continuar.');$s['phase']='verify';}
    elseif($s['phase']==='verify'){if($s['verify']<count($m['packages']))verify_package($m['packages'][$s['verify']++],$m,$s);else {foreach(($s['fileProgress']??[]) as $file)check($file['done'],'Un archivo está incompleto.');$s['phase']='ready';}}
    elseif($s['phase']==='tables'){$keys=array_keys($m['tables']);if($s['table']<count($keys)){$suffix=$keys[$s['table']];$name=$s['stage'].$suffix;if(!in_array($name,table_names($s['stage']),true))create_table($name,$m['tables'][$suffix]);$s['table']++;}else{query('CREATE TABLE IF NOT EXISTS '.identifier($s['journal']).' (entry_key varchar(100) PRIMARY KEY) ENGINE=InnoDB');$s['phase']='import';}}
    elseif($s['phase']==='import'){if($s['package']>=count($m['packages']))$s['phase']='switch';else{$p=$m['packages'][$s['package']];[$zip,$entries]=zip_index($p);if($s['entry']>=count($entries)){$s['package']++;$s['entry']=0;}else{$e=$entries[$s['entry']];$data=$zip->getFromName($e['entry']);check(is_string($data)&&hash_equals($e['sha256'],hash('sha256',$data)),'Un bloque ha cambiado después de verificarlo.');if($p['kind']==='database')import_rows($s,$m,$e,$data,$s['package'].':'.$s['entry']);else stage_file($s,$e,$data);$s['entry']++;}$zip->close();}}
    elseif($s['phase']==='switch'){switch_tables($s,$m);$s['phase']='finish';}
    elseif($s['phase']==='finish'){require_once ABSPATH.'wp-admin/includes/upgrade.php';wp_upgrade();flush_rewrite_rules(false);wp_cache_flush();$s['phase']='complete';$s['finished']=gmdate('c');}
    elseif($s['phase']==='rollback'){rollback_step($s,$m);}
    state_save($s);return public_state($s);
}
function confirm_import(&$s){check($s['phase']==='ready','Comprueba todos los paquetes antes de importar.');$s['originalPlugins']=get_option('active_plugins',[]);$s['phase']='tables';state_save($s);update_option('active_plugins',['sitioo-migration/sitioo-migration.php']);}
function rollback_start(&$s){check(!in_array($s['phase'],['rolledback','rollback'],true),'La recuperación ya está en curso o terminó.');$s['phase']='rollback';state_save($s);}
function rollback_step(&$s,$m) {
    global $wpdb;
    if(!$s['switched'] && $s['originalTables'] && in_array($s['old'].$s['originalTables'][0],table_names($s['old']),true))$s['switched']=true;
    if($s['switched']&&$s['originalTables']&&!in_array($s['old'].$s['originalTables'][0],table_names($s['old']),true)){$s['switched']=false;$s['dbRestored']=true;state_save($s);}
    if($s['switched']){$renames=[];foreach($m['tables'] as $suffix=>$schema)$renames[]=identifier($wpdb->prefix.$suffix).' TO '.identifier($s['stage'].$suffix);foreach($s['originalTables'] as $suffix)$renames[]=identifier($s['old'].$suffix).' TO '.identifier($wpdb->prefix.$suffix);query('RENAME TABLE '.implode(',',$renames));$s['switched']=false;$s['dbRestored']=true;wp_cache_flush();update_option('active_plugins',['sitioo-migration/sitioo-migration.php']);$u=get_user_by('login',$s['owner']);if($u)wp_set_current_user($u->ID);state_save($s);return;}
    if($s['files']){$relative=array_key_last($s['files']);$dest=target_file($relative,true);if($s['files'][$relative]){check(copy(current_job().'/originals/'.$relative,$dest),'No se pudo recuperar un archivo.');chmod($dest,$s['files'][$relative]['mode']??0644);if(isset($s['files'][$relative]['mtime']))touch($dest,$s['files'][$relative]['mtime']);}elseif(is_file($dest))check(unlink($dest),'No se pudo retirar un archivo importado.');if(function_exists('opcache_invalidate'))@opcache_invalidate($dest,true);unset($s['files'][$relative]);}
    else{if(isset($s['originalPlugins']))update_option('active_plugins',$s['originalPlugins']);$s['phase']='rolledback';flush_rewrite_rules(false);wp_cache_flush();}
}
function public_state($s) {
    if(!$s)return null;$m=json_read(current_job().'/manifest.json');return ['id'=>$s['id'],'phase'=>$s['phase'],'uploaded'=>$s['uploaded'],'verify'=>$s['verify'],'package'=>$s['package'],'entry'=>$s['entry'],'table'=>$s['table'],'packages'=>count($m['packages']),'tables'=>count($m['tables']),'snapshot'=>$s['snapshot'],'source'=>$m['source']['home'],'destination'=>$s['destination']['home'],'plugins'=>$s['sourcePlugins']??[],'started'=>$s['started'],'nonce'=>wp_create_nonce('sitioo-migrate')];
}
