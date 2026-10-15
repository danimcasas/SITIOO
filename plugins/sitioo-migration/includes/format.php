<?php
/** SITIOO package format 1. GPL-2.0-or-later. */
namespace Sitioo;
class Failure extends \RuntimeException {}
const VERSION = '0.3.0-beta.1';
const FORMAT = 1;
const PART_BYTES = 4194304;
function check($ok, $message) { if (!$ok) throw new Failure($message); }
function identifier($s) { check(is_string($s) && preg_match('/^[A-Za-z0-9_]{1,64}$/D', $s), 'Identificador de base de datos no compatible.'); return '`'.$s.'`'; }
function content_path($s) {
    check(is_string($s) && strlen($s) < 1024 && !preg_match('/[\\\\\x00-\x1f:]/', $s), 'Ruta no permitida en el paquete.');
    $parts = explode('/', $s);
    check(count($parts) >= 2 && in_array($parts[0], ['plugins','themes','uploads'], true), 'Solo se importan plugins, temas e imágenes.');
    foreach ($parts as $p) check($p !== '' && $p !== '.' && $p !== '..' && $p[0] !== '.', 'Ruta no permitida en el paquete.');
    if (PHP_OS_FAMILY === 'Windows') foreach ($parts as $p) check(!preg_match('/[<>"|?*]|[. ]$/u',$p) && !preg_match('/^(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\.|$)/iu',$p), 'El paquete contiene un nombre de archivo incompatible con Windows.');
    check(!($parts[0] === 'plugins' && strtolower($parts[1]) === 'sitioo-migration'), 'El importador no puede sustituirse a sí mismo.');
    if ($parts[0] === 'uploads') check(!preg_match('/\.(?:php\d*|phtml|phar|cgi|pl|sh|htaccess|user\.ini)$/i', $s), 'Se ha detectado código ejecutable en imágenes.');
    return $s;
}
function inside($path, $root) { if(!is_string($path)||!is_string($root)||$root==='')return false;if(PHP_OS_FAMILY==='Windows'){$path=strtolower(str_replace('\\','/',$path));$root=strtolower(str_replace('\\','/',$root));}return $path === $root || strpos($path, rtrim($root, '/').'/') === 0; }
function register_windows_path(&$state,$relative) {
    if(PHP_OS_FAMILY!=='Windows')return;
    check(extension_loaded('mbstring'),'Windows requiere la extensión PHP mbstring para comprobar los nombres de archivo.');
    $prefix='';foreach(explode('/',$relative) as $part){$prefix.=($prefix===''?'':'/').$part;$key=mb_strtolower($prefix,'UTF-8');$old=$state['pathAliases'][$key]??$prefix;check($old===$prefix,'Dos rutas de la copia solo se distinguen por mayúsculas. Renómbralas en el origen antes de importar en Windows.');$state['pathAliases'][$key]=$prefix;}
}
function json_read($file) { $value=json_decode(file_get_contents($file),true,64,JSON_THROW_ON_ERROR);check(is_array($value),'Archivo de control no válido.');return $value; }
function json_write($file, $value) {
    $tmp=$file.'.tmp';check(file_put_contents($tmp,json_encode($value,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),LOCK_EX)!==false,'No hay espacio para guardar el avance.');chmod($tmp,0600);check(rename($tmp,$file),'No se pudo guardar el avance.');
}
function query($sql) { global $wpdb; $old=$wpdb->suppress_errors(true);try{$result=$wpdb->query($sql);check($result!==false,'La base de datos no pudo completar esta etapa. Se conserva la recuperación.');return $result;}finally{$wpdb->suppress_errors($old);} }
function replace_plain($s,$map) { $pairs=[];foreach($map as $a=>$b){if($a==='')continue;$pairs[$a]=$b;$pairs[str_replace('/','\\/',$a)]=str_replace('/','\\/',$b);}return strtr($s,$pairs); }
/** Parse serialized PHP without instantiating objects or invoking magic methods. */
function serialized_value($s, &$pos, $map, $depth=0) {
    check($depth<100,'Datos serializados demasiado profundos.');$type=$s[$pos]??'';
    if($type==='N'){check(substr($s,$pos,2)==='N;','Serialización no compatible.');$pos+=2;return 'N;';}
    if(in_array($type,['b','i','d','r','R'],true)){check(preg_match('/\G[bidrR]:[^;{}]+;/A',$s,$m,0,$pos),'Serialización no compatible.');$pos+=strlen($m[0]);return $m[0];}
    if($type==='s'||$type==='E'){
        check(preg_match('/\G[sE]:(\d+):"/A',$s,$m,0,$pos),'Serialización no compatible.');$pos+=strlen($m[0]);$n=(int)$m[1];$value=substr($s,$pos,$n);$pos+=$n;check(substr($s,$pos,2)==='";','Serialización no compatible.');$pos+=2;
        $value=$type==='s'?replace_value($value,$map,$depth+1):$value;return $type.':'.strlen($value).':"'.$value.'";';
    }
    if($type==='a') {check(preg_match('/\Ga:(\d+):\{/A',$s,$m,0,$pos),'Serialización no compatible.');$pos+=strlen($m[0]);$count=(int)$m[1];check($count<1000000,'Colección demasiado grande.');$out=$m[0];for($i=0;$i<$count*2;$i++)$out.=serialized_value($s,$pos,$map,$depth+1);check(($s[$pos++]??'')==='}','Serialización no compatible.');return $out.'}';}
    if($type==='O') {check(preg_match('/\GO:(\d+):"/A',$s,$m,0,$pos),'Serialización no compatible.');$start=$pos;$pos+=strlen($m[0])+(int)$m[1];check(preg_match('/\G":(\d+):\{/A',$s,$m,0,$pos),'Serialización no compatible.');$pos+=strlen($m[0]);$out=substr($s,$start,$pos-$start);$count=(int)$m[1];check($count<1000000,'Objeto demasiado grande.');for($i=0;$i<$count*2;$i++)$out.=serialized_value($s,$pos,$map,$depth+1);check(($s[$pos++]??'')==='}','Serialización no compatible.');return $out.'}';}
    throw new Failure('Un plugin utiliza una serialización personalizada no compatible. No se ha publicado la base de datos.');
}
function replace_value($s,$map,$depth=0) {
    if(!is_string($s))return $s;check($depth<100,'Datos anidados demasiado profundos.');
    if(preg_match('/^(?:[aOsEC]:\d+:|[bidrR]:[^;]+;$|N;$)/s',$s)){$pos=0;$out=serialized_value($s,$pos,$map,$depth);check($pos===strlen($s),'Serialización no compatible.');return $out;}
    return replace_plain($s,$map);
}
function schema($table) {
    global $wpdb;
    identifier($table);$cols=$wpdb->get_results('SHOW FULL COLUMNS FROM '.identifier($table),ARRAY_A);check($cols,'No se pudo leer una tabla.');
    $indexes=$wpdb->get_results('SHOW INDEX FROM '.identifier($table),ARRAY_A);
    $out=['columns'=>[],'indexes'=>[]];
    foreach($cols as $c){check(!preg_match('/GENERATED/i',$c['Extra']),'Las columnas generadas todavía no son compatibles.');$out['columns'][]=['name'=>$c['Field'],'type'=>$c['Type'],'null'=>$c['Null']==='YES','default'=>$c['Default'],'extra'=>$c['Extra'],'collation'=>$c['Collation']];}
    foreach($indexes as $i){check(!empty($i['Column_name']) && in_array($i['Index_type'],['BTREE','FULLTEXT'],true),'Índice no compatible.');$name=$i['Key_name'];$out['indexes'][$name]['unique']=!$i['Non_unique'];$out['indexes'][$name]['type']=$i['Index_type'];$out['indexes'][$name]['columns'][]=['name'=>$i['Column_name'],'length'=>$i['Sub_part']?intval($i['Sub_part']):null];}
    return $out;
}
function create_table($name,$schema,$execute=true) {
    global $wpdb;$parts=[];$names=[];
    check(count($schema['columns']??[])>0 && count($schema['columns'])<=1024,'Esquema no válido.');
    foreach($schema['columns'] as $c){$field=identifier($c['name']);$names[]=$c['name'];
        check(preg_match('/^(?:[a-z]+(?:\(\d+(?:,\d+)?\))?(?: unsigned)?(?: zerofill)?|(?:enum|set)\((?:\x27(?:[^\x27\\\\]|\\\\.|\x27\x27)*\x27)(?:,\x27(?:[^\x27\\\\]|\\\\.|\x27\x27)*\x27)*\))$/iD',$c['type']),'Tipo de columna no compatible.');
        if(preg_match('/^(enum|set)/i',$c['type']))check(preg_match('/^(enum|set)\(\x27[A-Za-z0-9 _.+-]*\x27(?:,\x27[A-Za-z0-9 _.+-]*\x27)*\)$/iD',$c['type']),'Los valores especiales de ENUM o SET no están soportados en esta beta.');
        $line=$field.' '.$c['type'];
        if($c['collation']){$collation=$c['collation'];check(preg_match('/^[a-z0-9_]+$/iD',$collation),'Ordenación no válida.');$found=$wpdb->get_var($wpdb->prepare('SHOW COLLATION WHERE Collation = %s',$collation));if(!$found&&strpos($collation,'utf8mb4_')===0)$collation='utf8mb4_unicode_ci';else check((bool)$found,'El hosting no admite la codificación de una tabla.');$charset=explode('_',$collation)[0];$line.=' CHARACTER SET '.$charset.' COLLATE '.$collation;}
        $line.=$c['null']?' NULL':' NOT NULL';
        if($c['default']!==null){if(preg_match('/^current_timestamp(?:\(\d*\))?$/iD',$c['default']) && preg_match('/^(timestamp|datetime)/i',$c['type']))$line.=' DEFAULT '.$c['default'];else $line.=$wpdb->prepare(' DEFAULT %s',(string)$c['default']);}
        elseif($c['null'])$line.=' DEFAULT NULL';
        $extra=str_ireplace('DEFAULT_GENERATED','',$c['extra']);$extra=trim($extra);check($extra===''||preg_match('/^(auto_increment|on update CURRENT_TIMESTAMP(?:\(\d*\))?)$/iD',$extra),'Atributo de columna no compatible.');$line.=' '.$extra;$parts[]=$line;
    }
    foreach(($schema['indexes']??[]) as $key=>$index){$columns=[];foreach($index['columns'] as $c){check(in_array($c['name'],$names,true),'Índice no válido.');$col=identifier($c['name']);if($c['length']!==null){check(is_int($c['length'])&&$c['length']>0&&$c['length']<65536,'Índice no válido.');$col.='('.$c['length'].')';}$columns[]=$col;}
        check(in_array($index['type'],['BTREE','FULLTEXT'],true),'Índice no compatible.');$prefix=$key==='PRIMARY'?'PRIMARY KEY':($index['type']==='FULLTEXT'?'FULLTEXT KEY':($index['unique']?'UNIQUE KEY':'KEY')).' '.identifier($key);$parts[]=$prefix.' ('.implode(',',$columns).')';}
    $sql='CREATE TABLE '.identifier($name).' ('.implode(',',$parts).') ENGINE=InnoDB';if($execute)query($sql);return $sql;
}
function table_names($prefix) {global $wpdb;$names=$wpdb->get_col($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like($prefix).'%'));return array_values(array_filter($names,fn($t)=>strpos($t,$prefix)===0));}

function array_option($value) {
    $decoded=@unserialize($value,['allowed_classes'=>false]);check(is_array($decoded),'Una opción de WordPress no tiene el formato esperado.');
    $validate=function($item,$depth=0)use(&$validate){check($depth<50 && !is_object($item),'Una opción contiene objetos o estructuras no compatibles.');if(is_array($item))foreach($item as $child)$validate($child,$depth+1);};$validate($decoded);return $decoded;
}
