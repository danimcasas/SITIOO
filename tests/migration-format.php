<?php
require __DIR__.'/../plugins/sitioo-migration/includes/format.php';
function verify($ok){if(!$ok)throw new RuntimeException('Comprobación fallida.');}
function rejects($fn){try{$fn();}catch(Throwable $e){return;}throw new RuntimeException('Se aceptó una entrada no válida.');}
$map=['http://local.test'=>'https://example.test/tienda'];
$source=['url'=>'http://local.test/área','nested'=>serialize(['url'=>'http://local.test/ruta']), 'json'=>'{"url":"http:\/\/local.test\/ruta"}'];
$got=unserialize(Sitioo\replace_value(serialize($source),$map));verify($got['url']==='https://example.test/tienda/área');verify(unserialize($got['nested'])['url']==='https://example.test/tienda/ruta');verify(json_decode($got['json'],true)['url']==='https://example.test/tienda/ruta');
class Probe {public $url='http://local.test';public function __wakeup(){throw new RuntimeException('No se deben instanciar objetos.');}}
$serialized=Sitioo\replace_value(serialize(new Probe()),$map);verify(str_contains($serialized,'https://example.test/tienda'));
foreach(['../wp-config.php','plugins/../../wp-config.php','uploads/payload.php','uploads/.htaccess','plugins/sitioo-migration/migration.js','uploads/a\\b','uploads/a/../b','uploads/a:b'] as $bad)rejects(fn()=>Sitioo\content_path($bad));
verify(Sitioo\content_path('uploads/2026/imagen.jpg')==='uploads/2026/imagen.jpg');
rejects(fn()=>Sitioo\identifier('x; DROP TABLE wp_options'));rejects(fn()=>Sitioo\replace_value('C:4:"Test":0:{}',$map));rejects(fn()=>Sitioo\replace_value('s:99:"broken";',$map));
echo "PASS rutas, objetos sin ejecutar, serialización anidada, JSON y caracteres UTF-8\n";
verify(Sitioo\replace_value('http://local.test/wp/page',['http://local.test/wp'=>'http://local.test/site','http://local.test'=>'http://local.test/site'])==='http://local.test/site/page');
rejects(fn()=>Sitioo\content_path('plugins/SITIOO-Migration/sitioo-migration.php'));
echo "PASS sustituciones no repetidas y protección del propio importador\n";
if(PHP_OS_FAMILY==='Windows'){
 foreach(['uploads/CON.txt','uploads/nul','uploads/a.','uploads/a ','uploads/x?y'] as $bad)rejects(fn()=>Sitioo\content_path($bad));
 $s=[];Sitioo\register_windows_path($s,'uploads/ÁREA/a.txt');rejects(function()use(&$s){Sitioo\register_windows_path($s,'uploads/área/b.txt');});
 verify(Sitioo\inside('C:\\Raíz\\WEB\\sub','c:/raíz/web'));verify(!Sitioo\inside('C:\\web2','C:/web'));
 echo "PASS nombres reservados, colisiones y límites de carpetas Windows\n";
}
