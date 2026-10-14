'use strict';
// Solo avisos de las versiones ya incluidas en el PHAR oficial verificado.
const fs=require('node:fs/promises'),path=require('node:path');
async function get(url,json=false){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('HTTP '+r.status);return json?r.json():r.text();}
(async()=>{const base='licenses/WP-CLI',items=JSON.parse((await fs.readFile(base+'/componentes.json','utf8')).replace(/^\uFEFF/,'')),results=[];
 const work=async item=>{try{
  const data=await get('https://repo.packagist.org/p2/'+item.name+'.json',true);const versions=data.packages[item.name];
  let match=versions.find(v=>v.version.replace(/^v/,'')===item.version.replace(/^v/,''));
  if(!match)throw Error('Versión no encontrada.');
  // Packagist minifies metadata: source may be inherited from the preceding row.
  if(!match.source){let current={};for(const row of versions){current={...current,...row};if(row===match){match=current;break;}}}
  const repo=match.source?.url?.match(/^https:\/\/github\.com\/(.+?)(?:\.git)?$/)?.[1];if(!repo)throw Error('Revisar procedencia.');
  const ref=item.reference||match.source.reference;
  let notice,url;for(const file of ['LICENSE','LICENSE.md','LICENSE.txt','COPYING','COPYING.md']){url=`https://raw.githubusercontent.com/${repo}/${ref}/${file}`;try{notice=await get(url);break;}catch{}}
  if(!notice)throw Error('Aviso no localizado.');const dest=path.join(base,item.name.replace('/','--')+'.txt');await fs.writeFile(dest,notice);
  results.push({...item,license:match.license,url,status:'conservado'});
 }catch(e){results.push({...item,status:'revisar',message:e.message});}};
 for(let i=0;i<items.length;i+=6)await Promise.all(items.slice(i,i+6).map(work));
 await fs.writeFile(base+'/procedencia.json',JSON.stringify(results,null,2));console.log(JSON.stringify({total:results.length,conservados:results.filter(x=>x.status==='conservado').length,pendientes:results.filter(x=>x.status!=='conservado')}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
