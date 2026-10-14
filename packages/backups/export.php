<?php
/** Invoked by WP-CLI eval-file against a stopped local web server. */
require_once getenv('SITIOO_MIGRATION_LIB').'/format.php';
use function Sitioo\check;
use function Sitioo\identifier;
use function Sitioo\json_write;
try {
check(!is_multisite(),'Multisite todavía no está soportado.');
check(class_exists('ZipArchive'),'Falta la extensión ZIP.');
global $wpdb,$wp_version;
$config=Sitioo\json_read($args[0]);$output=$config['output'];check(is_dir($output),'No existe la carpeta de copia.');
$manifest=['format'=>Sitioo\FORMAT,'appVersion'=>Sitioo\VERSION,'snapshot'=>$config['snapshot'],'note'=>$config['note'],'createdAt'=>gmdate('c'),'wordpress'=>$wp_version,'source'=>['home'=>get_option('home'),'siteurl'=>get_option('siteurl'),'content'=>WP_CONTENT_DIR,'prefix'=>$wpdb->prefix],'tables'=>[],'packages'=>[],'excluded'=>['wp-config.php','core','mu-plugins','drop-ins','cache','sitioo-migration','keychain']];
$zip=null;$entries=[];$bytes=0;$number=0;$kind=null;$zipPath=null;
$flush=function()use(&$zip,&$entries,&$bytes,&$manifest,&$zipPath,&$kind){if(!$zip)return;check($zip->addFromString('index.json',json_encode($entries,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)),'No se pudo escribir el índice ZIP.');check($zip->close(),'No se pudo finalizar el ZIP.');chmod($zipPath,0600);$manifest['packages'][]=['name'=>basename($zipPath),'kind'=>$kind,'bytes'=>filesize($zipPath),'sha256'=>hash_file('sha256',$zipPath),'expanded'=>$bytes,'entries'=>count($entries)];$zip=null;$entries=[];$bytes=0;};
$add=function($type,$meta,$data)use(&$zip,&$entries,&$bytes,&$number,&$kind,&$zipPath,$output,$flush){if($zip&&($kind!==$type||$bytes+strlen($data)>16777216||count($entries)>=500))$flush();if(!$zip){$kind=$type;$number++;$zipPath=$output.'/sitioo-'.sprintf('%04d',$number).'-'.$type.'.zip';$zip=new ZipArchive();check($zip->open($zipPath,ZipArchive::CREATE|ZipArchive::EXCL)===true,'No se pudo crear el paquete.');}$entry='data/'.sprintf('%06d',count($entries));$meta['entry']=$entry;$meta['bytes']=strlen($data);$meta['sha256']=hash('sha256',$data);$entries[]=$meta;$bytes+=strlen($data);check($zip->addFromString($entry,$data),'No se pudo añadir un bloque al ZIP.');};
$tables=Sitioo\table_names($wpdb->prefix);
foreach($wpdb->get_results('SHOW FULL TABLES',ARRAY_N) as $definition)if(strpos($definition[0],$wpdb->prefix)===0)check($definition[1]==='BASE TABLE','Una tabla es una vista. Esta beta no puede exportarla conservando su funcionamiento.');
$triggers=$wpdb->get_results('SHOW TRIGGERS',ARRAY_A);foreach($triggers as $trigger)check(strpos($trigger['Table'],$wpdb->prefix)!==0,'Una tabla utiliza triggers; esta beta no puede exportarla de forma completa.');
foreach($tables as $table){$suffix=substr($table,strlen($wpdb->prefix));identifier($suffix);$definition=$wpdb->get_row('SHOW CREATE TABLE '.identifier($table),ARRAY_N);check(!preg_match('/\b(?:FOREIGN KEY|CHECK\s*\(|PARTITION BY)/i',$definition[1]??''),'Las tablas con restricciones o particiones especiales no están soportadas en esta beta.');$schema=Sitioo\schema($table);Sitioo\create_table('validation_'.$suffix,$schema,false);$schema['rows']=0;$manifest['tables'][$suffix]=$schema;$offset=0;
    while(true){$rows=$wpdb->get_results('SELECT * FROM '.identifier($table).' LIMIT 100 OFFSET '.intval($offset),ARRAY_A);check($wpdb->last_error==='','No se pudieron leer los datos.');if(!$rows)break;$buffer='';$count=0;
        foreach($rows as $row){$encoded=[];foreach($row as $key=>$value)$encoded[$key]=$value===null?null:base64_encode($value);$line=json_encode($encoded,JSON_THROW_ON_ERROR)."\n";check(strlen($line)<=Sitioo\PART_BYTES,'Una fila supera 4 MB; esta beta no puede exportarla.');if(strlen($buffer)+strlen($line)>Sitioo\PART_BYTES){$add('database',['table'=>$suffix,'rows'=>$count],$buffer);$buffer='';$count=0;}$buffer.=$line;$count++;$manifest['tables'][$suffix]['rows']++;}
        if($buffer!=='')$add('database',['table'=>$suffix,'rows'=>$count],$buffer);$offset+=count($rows);
    }
}
$flush();
foreach(['themes','plugins','uploads'] as $folder){$root=WP_CONTENT_DIR.'/'.$folder;if(!is_dir($root))continue;$iterator=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS));foreach($iterator as $file){check(!$file->isLink(),'Hay un enlace simbólico en el contenido; sustituye el enlace por archivos antes de exportar.');if(!$file->isFile())continue;$relative=str_replace('\\','/',substr($file->getPathname(),strlen(WP_CONTENT_DIR)+1));if(strpos($relative,'plugins/sitioo-migration/')===0)continue;if(preg_match('~(?:^|/)\.~',$relative))continue;Sitioo\content_path($relative);$total=$file->getSize();check($total<=2147483647,'Un archivo supera el límite de 2 GB de esta beta.');$handle=fopen($file->getPathname(),'rb');check($handle!==false,'No se pudo leer un archivo del contenido.');$offset=0;do{$data=fread($handle,Sitioo\PART_BYTES);check($data!==false,'No se pudo leer un bloque.');$add('files',['path'=>$relative,'offset'=>$offset,'total'=>$total],$data);$offset+=strlen($data);}while($offset<$total);fclose($handle);check($offset===$total,'Un archivo cambió durante la copia. Repite sin editar el proyecto.');}}
$flush();
check(strlen(json_encode($manifest))<2097152,'El índice supera el tamaño admitido por esta beta.');json_write($output.'/sitioo-manifest.json',$manifest);
echo "SITIOO_EXPORT_OK\n";

} catch (\Sitioo\Failure $e) { WP_CLI::error('SITIOO: '.$e->getMessage()); }
catch (\Throwable $e) { WP_CLI::error('SITIOO: No se pudo completar la copia. Revisa espacio y compatibilidad.'); }


