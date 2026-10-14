<?php
// Contrato de formato con el lector original beta.1, ejecutado en Windows.
// No representa una importación en un Mac físico ni prueba una base remota.
require __DIR__.'/fixtures/plugin-beta1/includes/format.php';
function ensure($ok){if(!$ok)throw new RuntimeException('Contrato de formato incompatible.');}
$root=$argv[1];$m=json_decode(file_get_contents($root.'/sitioo-manifest.json'),true,64,JSON_THROW_ON_ERROR);
ensure($m['format']===Sitioo\FORMAT);
$wpdb=new class {function get_var($sql){return 'utf8mb4_unicode_ci';}function prepare($sql,$value){return str_replace('%s',"'".str_replace("'","''",$value)."'",$sql);}};
foreach($m['tables'] as $name=>$schema)ensure(str_starts_with(Sitioo\create_table('validate_'.$name,$schema,false),'CREATE TABLE'));
$entries=0;$files=0;
foreach($m['packages'] as $p){
 $file=$root.'/'.$p['name'];ensure(filesize($file)===$p['bytes']);ensure(hash_equals($p['sha256'],hash_file('sha256',$file)));
 $zip=new ZipArchive();ensure($zip->open($file)===true);$index=json_decode($zip->getFromName('index.json'),true,64,JSON_THROW_ON_ERROR);ensure(count($index)===$p['entries']&&$zip->numFiles===count($index)+1);
 foreach($index as $entry){$data=$zip->getFromName($entry['entry']);ensure(is_string($data)&&strlen($data)===$entry['bytes']&&hash_equals($entry['sha256'],hash('sha256',$data)));if($p['kind']==='files'){ensure(Sitioo\content_path($entry['path'])===$entry['path']);$files++;}else {ensure(isset($m['tables'][$entry['table']]));foreach(explode("\n",trim($data)) as $line)json_decode($line,true,64,JSON_THROW_ON_ERROR);}$entries++;}
 $zip->close();
}
echo json_encode(['test'=>'Contrato de paquetes 1 con funciones originales beta.1','state'=>'superada','platform'=>PHP_OS_FAMILY,'tables'=>count($m['tables']),'packages'=>count($m['packages']),'entries'=>$entries,'file_blocks'=>$files,'limitation'=>'Sin ejecución física de Mac; no valida permisos ni motor de Mac.'],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)."\n";
