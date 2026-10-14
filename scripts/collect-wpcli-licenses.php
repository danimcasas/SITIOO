<?php
$phar=new Phar($argv[1]);$out=$argv[2];$count=0;
foreach(new RecursiveIteratorIterator($phar) as $file){if(!$file->isFile()||!preg_match('~/(?:LICENSE|COPYING|NOTICE)(?:\.[a-z]+)?$~i',$file->getPathname()))continue;$name=substr($file->getPathname(),strlen('phar://'.$argv[1])+1);if(str_contains($name,'..'))exit(2);$target=$out.'/'.$name;if(!is_dir(dirname($target)))mkdir(dirname($target),0755,true);file_put_contents($target,file_get_contents($file->getPathname()));$count++;}
echo "WP-CLI: $count avisos conservados.\n";
