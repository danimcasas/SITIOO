<?php
$p=new Phar($argv[1]);$rows=[];$present=[];
foreach(new RecursiveIteratorIterator($p) as $file)if(preg_match('~/vendor/([^/]+/[^/]+)/~',$file->getPathname(),$match))$present[$match[1]]=true;
foreach(new RecursiveIteratorIterator($p) as $file){
 if(!$file->isFile()||!str_ends_with($file->getPathname(),'/vendor/composer/installed.php'))continue;
 $data=require $file->getPathname();
 foreach($data['versions'] as $name=>$v)if(isset($present[$name],$v['pretty_version']))$rows[]=['name'=>$name,'version'=>$v['pretty_version'],'reference'=>$v['reference']??null];
}
echo json_encode($rows,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
