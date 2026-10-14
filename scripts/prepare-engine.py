"""Build the private macOS engine without modifying the host's Homebrew installation."""
import hashlib, json, os, pathlib, shutil, struct, subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT/'.local/downloads'; ENGINE=ROOT/'.local/engine'; VENDOR=ROOT/'.local/vendor'
for p in (CACHE,ENGINE/'bin',ENGINE/'lib',VENDOR): p.mkdir(parents=True,exist_ok=True)
def download(url,dest,headers=()):
    args=['curl','-fsSL','--retry','2']
    for h in headers: args += ['-H',h]
    subprocess.run(args+[url,'-o',str(dest)],check=True)
def formula(name):
    dest=CACHE/(name.replace('/','_')+'.json')
    if not dest.exists(): download('https://formulae.brew.sh/api/formula/'+name+'.json',dest)
    return json.loads(dest.read_text())
installed={}
def bottle(name):
    if name in installed:return installed[name]
    data=formula(name); files=data['bottle']['stable']['files']; item=files.get('arm64_tahoe') or files.get('arm64_sequoia')
    if not item:raise RuntimeError('No compatible bottle for '+name)
    dest=CACHE/(name.replace('/','_')+'.tar.gz')
    if not dest.exists():
        repo=item['url'].split('/v2/')[1].split('/blobs/')[0]
        tokenfile=CACHE/'registry-token.json'
        download('https://ghcr.io/token?service=ghcr.io&scope=repository:'+repo+':pull',tokenfile)
        token=json.loads(tokenfile.read_text())['token']
        download(item['url'],dest,['Authorization: Bearer '+token])
        tokenfile.write_text('{}')
    if hashlib.sha256(dest.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Checksum mismatch: '+name)
    target=VENDOR/name
    if not target.exists():
        subprocess.run(['tar','-xzf',str(dest),'-C',str(VENDOR)],check=True)
    versions=[p for p in target.iterdir() if p.is_dir()]
    prefix=versions[0]; installed[name]=prefix
    print('Verified package:',name,data['versions']['stable'],flush=True)
    return prefix

def dependencies(data):
    if data[:4]!=b'\xcf\xfa\xed\xfe':raise RuntimeError('Expected thin arm64 Mach-O')
    count=struct.unpack_from('<I',data,16)[0]; offset=32; found=[]
    for _ in range(count):
        cmd,size=struct.unpack_from('<II',data,offset)
        if cmd in (0xc,0xd,0x80000018,0x8000001f,0x20,0x80000023):
            noff=struct.unpack_from('<I',data,offset+8)[0]
            name=data[offset+noff:offset+size].split(b'\0')[0].decode()
            found.append((cmd,offset+noff,offset+size,name))
        offset+=size
    return found

def resolve(name,source):
    if name.startswith('@loader_path/'):return (source.parent/name[len('@loader_path/'):]).resolve()
    if name.startswith('@rpath/'):
        candidate=source.parent/pathlib.Path(name).name
        if candidate.exists():return candidate.resolve()
        raise RuntimeError('Unresolved rpath: '+name)
    p=pathlib.Path(name)
    if p.exists():return p.resolve()
    normalized=name.replace('@@HOMEBREW_PREFIX@@','/opt/homebrew').replace('@@HOMEBREW_CELLAR@@','/opt/homebrew/Cellar')
    if '/opt/homebrew/opt/' in normalized:
        tail=normalized.split('/opt/homebrew/opt/',1)[-1]; package,relative=tail.split('/',1)
        return bottle(package)/relative
    if '/Cellar/' in normalized:
        package,version,relative=normalized.split('/Cellar/',1)[1].split('/',2)
        return bottle(package)/relative
    raise RuntimeError('Missing dependency: '+name)

copied={}
def relocate(source,target):
    source=source.resolve();target=target.resolve()
    if target in copied:return
    copied[target]=str(source)
    target.parent.mkdir(parents=True,exist_ok=True)
    original=source.read_bytes()
    data=bytearray(original)
    replacements={}
    for cmd,start,end,name in dependencies(data):
        if cmd==0xd:
            new='@rpath/'+target.name
        elif name.startswith('/usr/lib/') or name.startswith('/System/'):
            continue
        else:
            dep=resolve(name,source); dest=ENGINE/'lib'/dep.name
            relocate(dep,dest)
            new='@loader_path/'+os.path.relpath(dest,target.parent)
        replacements[start]=new
    count=struct.unpack_from('<I',original,16)[0]
    offset=32; commands=[]; first_data=len(original)
    for _ in range(count):
        cmd,size=struct.unpack_from('<II',original,offset)
        command=bytearray(original[offset:offset+size])
        if cmd==0x19:
            nsects=struct.unpack_from('<I',command,64)[0]
            for section in range(nsects):
                section_offset=struct.unpack_from('<I',command,72+section*80+48)[0]
                if section_offset:first_data=min(first_data,section_offset)
        if cmd in (0xc,0xd,0x80000018,0x8000001f,0x20,0x80000023):
            noff=struct.unpack_from('<I',command,8)[0]
            if offset+noff in replacements:
                text=replacements[offset+noff].encode()+b'\0'
                newsize=(noff+len(text)+7)//8*8
                command=command[:noff]+text+b'\0'*(newsize-noff-len(text))
                struct.pack_into('<I',command,4,newsize)
        commands.append(command);offset+=size
    combined=b''.join(commands)
    if 32+len(combined)>first_data:raise RuntimeError('Insufficient Mach-O header padding: '+str(source))
    data[32:first_data]=combined+b'\0'*(first_data-32-len(combined))
    struct.pack_into('<I',data,20,len(combined))
    target.write_bytes(data);target.chmod(0o755)
    subprocess.run(['codesign','--force','--sign','-',str(target)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)

prefix=bottle('mariadb@11.4')
maria=ENGINE/'mariadb';(maria/'bin').mkdir(parents=True,exist_ok=True)
for name in ('mariadbd','mariadb','my_print_defaults','resolveip'):
    src=prefix/'bin'/name
    if src.exists():relocate(src,maria/'bin'/name)
for folder in ('share','scripts'):
    if (prefix/folder).exists():shutil.copytree(prefix/folder,maria/folder,dirs_exist_ok=True)
for name in ('mariadb-install-db','mysql_install_db'):
    src=prefix/'bin'/name
    if src.exists():shutil.copy2(src,maria/'bin'/name)
install_script=maria/'bin/mariadb-install-db'
install_script.write_text(install_script.read_text().replace('$basedir/bin $basedir/extra','"$basedir/bin" "$basedir/extra"'))
relocate(pathlib.Path('/opt/homebrew/bin/php'),ENGINE/'bin/php')
shutil.copy2(ROOT/'.local/wp-cli.phar',ENGINE/'wp-cli.phar')
if not (ENGINE/'wordpress').exists():subprocess.run(['unzip','-q',str(ROOT/'.local/wordpress.zip'),'-d',str(ENGINE)],check=True)
shutil.copy2('/etc/ssl/cert.pem',ENGINE/'cacert.pem')
shutil.copy2(ROOT/'packages/engine/router.php',ENGINE/'router.php')
shutil.copy2(ROOT/'packages/engine/watchdog.cjs',ENGINE/'watchdog.cjs')
manifest={'php':'bin/php','database':'mariadb/bin/mariadbd','client':'mariadb/bin/mariadb','installDb':'mariadb/bin/mariadb-install-db','wpCli':'wp-cli.phar','wordpress':'wordpress'}
(ENGINE/'manifest.json').write_text(json.dumps(manifest,indent=2))
(ROOT/'.local/engine-files.json').write_text(json.dumps({str(k):v for k,v in copied.items()},indent=2))
print('Engine prepared:',len(copied),'native files',flush=True)

(ENGINE/'empty-ini').mkdir(exist_ok=True)
(ENGINE/'php.ini').write_text('curl.cainfo="${SITIOO_CA_FILE}"\nopenssl.cafile="${SITIOO_CA_FILE}"\nerror_reporting=22527\ndisplay_errors=Off\n')
(ENGINE/'wp-cli.yml').write_text('color: false\n')
