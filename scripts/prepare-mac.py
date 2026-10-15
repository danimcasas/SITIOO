"""Prepare a versioned Mac engine in the checkout; never install host services."""
import hashlib
import json
import pathlib
import platform
import re
import shutil
import stat
import subprocess
import sys
import uuid
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENGINE = ROOT / '.local/engine'
CACHE = ROOT / '.local/downloads'
STAGING = ROOT / '.local/mac-preparation'


def sha256(file):
    with file.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def fetch(item):
    target = CACHE / item['name']
    if target.exists() and target.stat().st_size == item['bytes'] and sha256(target) == item['sha256']:
        return target
    pending = CACHE / (item['name'] + '.' + uuid.uuid4().hex + '.pending')
    subprocess.run(['curl', '-fL', '--retry', '2', '--max-time', '180', item['url'], '-o', str(pending)], check=True)
    if pending.stat().st_size != item['bytes'] or sha256(pending) != item['sha256']:
        raise RuntimeError('La descarga no coincide con la versión fijada: ' + item['name'])
    if target.exists():
        target.rename(CACHE / (target.name + '.preserved-' + uuid.uuid4().hex))
    pending.rename(target)
    return target


def extract(archive, directory):
    with zipfile.ZipFile(archive) as source:
        if len(source.infolist()) > 30000 or sum(i.file_size for i in source.infolist()) > 300 * 1024**2:
            raise RuntimeError('Archivo de WordPress demasiado grande.')
        for entry in source.infolist():
            parts = pathlib.PurePosixPath(entry.filename)
            if parts.is_absolute() or '..' in parts.parts or '\\' in entry.filename or stat.S_ISLNK(entry.external_attr >> 16):
                raise RuntimeError('Ruta no válida dentro de WordPress.')
        source.extractall(directory)


def output(arguments):
    return subprocess.run(arguments, check=True, capture_output=True, text=True).stdout.strip()


def prepare():
    if sys.platform != 'darwin' or platform.machine() != 'arm64':
        raise RuntimeError('Esta receta requiere un Mac Apple Silicon.')
    manifest_path = ENGINE / 'manifest.json'
    if not manifest_path.exists():
        raise RuntimeError('Prepara primero el motor nativo con python3 scripts/prepare-engine.py. Consulta docs/MACOS.md.')
    manifest = json.loads(manifest_path.read_text())
    for key in ['php', 'database', 'client', 'installDb', 'wpCli', 'wordpress']:
        value = manifest.get(key)
        if not isinstance(value, str) or pathlib.Path(value).is_absolute() or '..' in pathlib.PurePath(value).parts:
            raise RuntimeError('Manifiesto del motor no válido.')
        if not (ENGINE / value).exists():
            raise RuntimeError('Falta un componente nativo del motor Mac.')
    CACHE.mkdir(parents=True, exist_ok=True)
    STAGING.mkdir(parents=True, exist_ok=True)
    # WordPress and its translation are the same platform-independent inputs as Windows.
    locked = {item['name']: item for item in json.loads((ROOT / 'config/windows-dependencies.lock.json').read_text())}
    core = locked['wordpress-7.1.3.zip']
    translation = locked['wordpress-7.1.3-es_ES.zip']
    core_zip, language_zip = fetch(core), fetch(translation)
    marker = ENGINE / 'wordpress-inputs.json'
    inputs = {item['name']: item['sha256'] for item in [core, translation]}
    previous = json.loads(marker.read_text()) if marker.exists() else None
    wordpress = ENGINE / manifest['wordpress']
    if previous != inputs:
        staged = STAGING / ('wordpress-' + uuid.uuid4().hex)
        staged.mkdir(mode=0o700)
        extract(core_zip, staged)
        fresh = staged / 'wordpress'
        languages = fresh / 'wp-content/languages'
        languages.mkdir(parents=True, exist_ok=True)
        extract(language_zip, languages)
        version = re.search(r"\$wp_version\s*=\s*'([^']+)'", (fresh / 'wp-includes/version.php').read_text()).group(1)
        if version != '7.1.3':
            raise RuntimeError('Versión inesperada dentro del paquete de WordPress.')
        if wordpress.exists():
            wordpress.rename(STAGING / ('previous-wordpress-' + uuid.uuid4().hex))
        fresh.rename(wordpress)
        marker.write_text(json.dumps(inputs, indent=2) + '\n')
    else:
        version = re.search(r"\$wp_version\s*=\s*'([^']+)'", (wordpress / 'wp-includes/version.php').read_text()).group(1)
        if version != '7.1.3':
            raise RuntimeError('La plantilla WordPress cambió después de prepararla.')
    for name in ['router.php', 'watchdog.cjs']:
        shutil.copy2(ROOT / 'packages/engine' / name, ENGINE / name)
    php = str(ENGINE / manifest['php'])
    required = ['mysqli', 'zip', 'curl', 'openssl', 'mbstring']
    for extension in required:
        if output([php, '-n', '-r', "echo extension_loaded('" + extension + "') ? 'yes' : 'no';"]) != 'yes':
            raise RuntimeError('Falta una extensión PHP: ' + extension)
    php_version = output([php, '-n', '-r', 'echo PHP_VERSION;'])
    database_version = output([str(ENGINE / manifest['database']), '--no-defaults', '--version'])
    maria_version = re.search(r'\b(11\.4\.\d+)\b', database_version).group(1)
    cli = ENGINE / manifest['wpCli']
    if sha256(cli) != locked['wp-cli-2.12.0.phar']['sha256']:
        raise RuntimeError('WP-CLI no coincide con la versión fijada.')
    manifest.update(platform='darwin', arch='arm64', version=json.loads((ROOT / 'package.json').read_text())['version'],
                    phpVersion=php_version, mariaDbVersion=maria_version, wordpressVersion=version, wpCliVersion='2.12.0')
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    notices = ENGINE / 'licenses'
    notices.mkdir(exist_ok=True)
    shutil.copy2(wordpress / 'license.txt', notices / 'WordPress.txt')
    (notices / 'LEEME-MAC.txt').write_text(
        'Componentes del motor Mac: PHP ' + php_version + ', MariaDB ' + maria_version + ', WordPress ' + version + ', WP-CLI 2.12.0.\n'
        'Se conservan las licencias y SOURCES.txt del motor nativo preparado con Homebrew.\n'
        'WordPress y traducción: URL, tamaños y SHA-256 fijados en config/windows-dependencies.lock.json; son archivos independientes de plataforma.\n'
        'Los componentes nativos se redistribuyen con sus propias licencias. Electron incluye los avisos de Chromium en el paquete de la aplicación.\n'
        'El usuario final no necesita Homebrew ni instalar PHP o MariaDB.\n', encoding='utf8')
    native_hashes = {}
    for file in ENGINE.rglob('*'):
        if file.is_file():
            with file.open('rb') as handle:
                magic = handle.read(4)
            if magic == bytes.fromhex('cffaedfe'):
                native_hashes[file.relative_to(ENGINE).as_posix()] = sha256(file)
    (ENGINE / 'native-files.sha256.json').write_text(json.dumps(native_hashes, indent=2) + '\n')
    print('Motor Mac listo: PHP ' + php_version + ', MariaDB ' + maria_version + ', WordPress ' + version + '. ' + str(len(native_hashes)) + ' binarios registrados.')


if __name__ == '__main__':
    try:
        prepare()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
