# SITIOO 0.3.0-beta.2 para Mac

Esta entrega alinea Mac con las funciones de Windows 0.3.0-beta.1: plugin incluido, duplicación, recuperación como proyecto nuevo e importación local. WordPress de los nuevos sitios es 7.1.3. Los sitios existentes conservan su versión de WordPress y su contenido; no se actualiza su núcleo automáticamente.

Requiere Apple Silicon y macOS 26 o posterior. El motor de esta entrega conserva PHP 8.5.9, MariaDB 11.4.13 y WP-CLI 2.12.0 del motor Mac anterior. La beta no tiene firma Developer ID ni notarización. Los resultados efectivos y los límites están en PRUEBAS-MAC-0.3.md.

## Para utilizarla

Abre el DMG y copia SITIOO a Aplicaciones. Usa el manual-app.html para crear sitios y trabajar con copias. Los archivos de usuario se guardan fuera de la aplicación. Antes de sustituir una beta, cierra SITIOO y conserva la carpeta indicada en Ayuda → Abrir carpeta de datos.

Para importar en Mac, pulsa Importar copia y selecciona la carpeta exportada completa, con su índice y todos los ZIP juntos. SITIOO comprueba los paquetes antes de crear el destino.

SITIOO Migration se instala y activa en nuevos proyectos. En proyectos anteriores se solicita confirmación y se conserva la versión reconocida antes de actualizarla; una versión modificada se bloquea. El ZIP del plugin sigue siendo independiente y se puede distribuir desde la landing sin GitHub.

## Preparar el motor para desarrollo

Requiere Node.js, Python 3.11 o posterior, las dependencias fijadas en package-lock.json y un motor Mac nativo en .local/engine. El desarrollador puede generar la base con scripts/prepare-engine.py: usa PHP Homebrew existente, paquetes Homebrew verificados, .local/wp-cli.phar y .local/wordpress.zip. Ese proceso instala archivos únicamente dentro del proyecto. La preparación inicial de todas las bibliotecas nativas todavía depende del entorno de construcción; no es una compilación idéntica garantizada desde cualquier Mac.

Con la base disponible:

```sh
npm run prepare:mac
npm test
npm run test:mac
npm run dist:mac
```

prepare:mac descarga las versiones fijadas de WordPress 7.1.3 y su traducción española, comprueba tamaños y SHA-256, conserva la plantilla anterior y registra versiones y huellas de los ejecutables. Los archivos universales se toman del mismo listado de dependencias fijadas que Windows. La preparación no modifica los sitios del usuario ni instala servicios en macOS.

El motor nativo, los datos ficticios y las dependencias locales no se suben a Git. Los avisos originales del motor permanecen en resources/engine/licenses. Electron conserva sus avisos en el paquete de aplicación.

## Pruebas separadas

SITIOO_DATA_DIR selecciona un perfil ficticio de aplicación. SITIOO_ENGINE y SITIOO_MIGRATION_ASSETS permiten comprobar los recursos extraídos de un DMG. Los scripts de transferencia generan sitios ficticios en .local y guardan resultados sin contraseñas en .local/mac-evidence. Para comparar con el código de la antigua beta Mac, SITIOO_LEGACY_ASSETS y SITIOO_LEGACY_VERSION identifican sus recursos; test-mac-upgrade.cjs usa SITIOO_LEGACY_ROOT.

Las pruebas requieren abrir puertos en 127.0.0.1 y ejecutar Electron en el Mac real. El test del llavero utiliza una credencial aleatoria en memoria y guarda solamente el archivo cifrado y una huella de comprobación. No se utilizan sitios personales.

Los sockets de base de datos usan una carpeta privada del proyecto. Si la ruta excede el límite Unix, se utiliza una carpeta temporal privada identificada por el perfil; no se abre MariaDB a la red. La aplicación rechaza carpetas de comunicación con permisos inseguros.

## Publicación

El DMG, el plugin, las fuentes y los manuales se entregan por separado con SHA-256. La versión Windows publicada se conserva y sus resultados no se atribuyen a esta compilación Mac. La firma Apple requiere un certificado Developer ID Application y un perfil de notarización en el llavero; consulta INSTALACION-Y-FIRMA.md.
