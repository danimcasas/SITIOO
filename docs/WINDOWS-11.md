# SITIOO 0.3.0-beta.1 para Windows 11 x64

## Arquitectura

La interfaz Electron, Store, AccessVault, Backups y plugin son compartidos. El módulo `local.cjs` selecciona el motor del sistema. Windows tiene PHP NTS y cuatro procesos PHP propios detrás de una entrada HTTP en 127.0.0.1. MariaDB abre un puerto local autenticado independiente por proyecto. No se registran servicios, tareas de arranque ni reglas de firewall.

El ayudante nativo `native/sitioo-win.cpp` crea cada proceso suspendido, lo incorpora a un Job privado y lo reanuda. Cerrar el ayudante o su proceso padre termina exclusivamente ese árbol. La parada normal cierra HTTP, envía SHUTDOWN autenticado y espera a MariaDB. Ante cierre brusco, InnoDB utiliza su recuperación al siguiente arranque.

Los secretos del motor se generan al crear cada proyecto y se guardan con DPAPI CurrentUser. No se usa CRYPTPROTECT_LOCAL_MACHINE ni almacenamiento alternativo. La base se inicializa sin red mediante bootstrap. Las claves viajan a los procesos hijos en memoria; no figuran en argumentos, wp-config.php ni archivos temporales de texto. El archivo wp-config.php consulta variables del proceso. La bóveda de accesos usa safeStorage asíncrono de Electron y rechaza el guardado cuando no hay cifrado disponible. Las carpetas privadas restringen su ACL a la cuenta actual y SYSTEM; los enlaces y puntos de redirección se rechazan.

WP-CLI se invoca con su ruta relativa al directorio del motor. Se fijan home y siteurl con la dirección local del proyecto después de instalar WordPress para evitar que el cálculo de URL desde consola añada una ruta larga. La configuración de enlaces utiliza option update y flush_rewrite_rules dentro de PHP: evita el subproceso de `wp rewrite structure`, que altera rutas con espacios/acentos en Windows. Los argumentos externos se pasan como listas con shell:false.

Los proyectos, bases, accesos y copias viven fuera del directorio instalado. Ubicación normal: `%APPDATA%\SITIOO`. SITIOO_DATA_DIR permite un perfil de prueba aislado. La copia de desarrollo usa `.local/profile` y `.local/projects`. El instalador por usuario conserva AppData por defecto y no eleva permisos. No se requiere reiniciar Windows.

La retirada de archivos utiliza la sintaxis de rutas extendidas de Windows dentro de NSIS. Conserva el traslado provisional y la restauración del instalador base si falla una actualización. Esto evita el límite de 260 caracteres en los archivos profundos de WordPress, sin cambiar la configuración global de rutas largas del PC.

## Reproducir la compilación

Usar Windows 11 x64 y PowerShell 7. Herramientas de desarrollo: Git; Node.js 24.x con npm; Microsoft C++ Build Tools 2019 o posterior con compilador x64 y Windows SDK. La comprobación de esta entrega utilizó MSVC 19.29 y Windows SDK instalado. No se necesita .NET para ejecutar SITIOO. Instalar herramientas que falten requiere la autorización del propietario del equipo.

1. Extraer el código en una carpeta nueva. Conservar el archivo de versiones `package-lock.json` y `config/windows-dependencies.lock.json`.
2. Preparar cachés solo para el proceso actual:

```powershell
$env:npm_config_cache = Join-Path $PWD '.local\cache\npm'
$env:ELECTRON_CACHE = Join-Path $PWD '.local\cache\electron'
$env:ELECTRON_BUILDER_CACHE = Join-Path $PWD '.local\cache\electron-builder'
npm ci --no-audit --no-fund
node -e "require('app-builder-lib/out/toolsets/7zip').getPath7za().then(p=>console.log(p))"
```

3. Copiar, si se dispone de ellos, los archivos de componentes conservados en la entrega a `.local/downloads`. Si no están presentes, el siguiente script los descarga de las URL oficiales y comprueba sus hashes fijados. Un hash distinto detiene la preparación; no actualizarlo sin revisar el componente.

```powershell
pwsh -NoProfile -File scripts/fetch-windows.ps1
pwsh -NoProfile -File scripts/build-native.ps1
pwsh -NoProfile -File scripts/prepare-windows.ps1
pwsh -NoProfile -File scripts/prepare-crt.ps1
node scripts/prepare-migration.cjs
npm test
node scripts/run-windows-tests.cjs
node scripts/test-migration-windows.cjs
node scripts/run-transfers-tests.cjs
node scripts/test-desktop-transfers.cjs
npm run dist:win
```

`prepare-crt.ps1` comprueba la firma de Microsoft y extrae únicamente DLL x64 redistribuibles junto a PHP/MariaDB. No ejecuta vc_redist ni modifica el sistema. El ayudante se compila con /MT. El script de compilación debe copiar su resultado y fuente al plugin antes de preparar la migración.

Electron Builder 26.15.3 utiliza su herramienta NSIS empaquetada como `nsis-3.0.4.1`, recursos 3.4.1 y herramientas de iconos/7zip. Ese es el paquete resuelto realmente por el compilador; la propuesta inicial estimaba NSIS 3.12. El resultado se guarda en `dist/0.3.0-beta.1`. El ejecutable final es `SITIOO-0.3.0-beta.1-windows-x64-setup.exe`.

No se promete identidad binaria entre compilaciones: las marcas de tiempo y las herramientas pueden afectar los bytes. Las versiones y sumas permiten reproducir los componentes. No se utiliza una clave de firma ni se publica automáticamente.

## Pruebas

`npm test` comprueba registro, bóveda, control de operaciones, integridad de copias, interfaz del plugin, DPAPI real, argumentos literales y cierre de árboles propios en Windows. Las pruebas exclusivas de instalación Mac quedan omitidas en Windows.

`run-windows-tests.cjs` utiliza Electron real y crea dos sitios ficticios en una carpeta nueva con espacios y acentos; comprueba wp-admin, independencia, cifrado, reapertura, instalación y actualización del plugin y un servidor ajeno que ocupa un puerto. SITIOO_ENGINE puede apuntar al motor de una instalación para comprobar sus componentes reales.

`test-migration-windows.cjs` crea origen y destino ficticios; comprueba copias, paquetes dañados, permisos de acceso, subida repetible, importación, cambio de dominio/prefijo, datos serializados, archivo dividido, interrupciones simuladas y recuperación. Conserva los datos de prueba en `.local`; no incluirlos en una entrega.

La instalación, interfaz instalada, actualización y desinstalación requieren comprobación adicional con el .exe real. Una compilación correcta no cuenta como esas pruebas. No reiniciar Windows sin coordinación. El informe de entrega indica resultados y límites; esta documentación no certifica por sí sola la ejecución.


## Transferencias a nuevos proyectos

ProjectTransfers es compartido entre motores. La aplicación mantiene una operación exclusiva durante la copia y la recuperación, valida los paquetes y usa un directorio privado de preparación. createLocked permite importar antes de abrir HTTP; el destino se detiene al terminar. El importador PHP compartido mantiene formato 1. El motor Mac conserva su adaptador; la ejecución física de estas funciones en Mac sigue pendiente.

Las pruebas de interfaz usan exclusivamente el perfil ficticio generado por test:transfers:windows. El selector de archivo recibe un paquete ficticio controlado. La comprobación de la aplicación instalada abre su ejecutable real con un puerto de depuración local temporal y lo cierra al terminar. No utiliza la sesión de Chrome del usuario. La prueba de paquetes del exportador anterior es opcional cuando su carpeta conservada está disponible; el informe lo indica.
