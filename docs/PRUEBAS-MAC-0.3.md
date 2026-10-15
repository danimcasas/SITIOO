# Pruebas Mac — SITIOO 0.3.0-beta.2

Fecha: 15 de octubre de 2026. Base: repositorio SITIOO, commit e90cf0aecd1400447cb4c7d0e71bd30181cc0bca, correspondiente a Windows 0.3.0-beta.1. Desarrollo en una copia independiente, rama codex/macos-0.3. Los originales y el DMG 0.2.0-beta.1 se conservan.

## Entorno y componentes

Mac Apple Silicon; Electron 44.7.0, electron-builder 26.15.3, PHP 8.5.9, MariaDB 11.4.13, WordPress 7.1.3 con traducción española y WP-CLI 2.12.0. Se reutilizó una copia del motor Mac ya disponible. WordPress y su traducción se descargaron de los archivos oficiales fijados en el repositorio y se verificaron mediante tamaño y SHA-256. No se instalaron servicios ni se modificaron sitios personales.

## Comprobaciones ejecutadas

| Área | Resultado |
| --- | --- |
| Pruebas de Node | 38 casos: 35 superados, 0 fallidos, 3 omitidos por ser específicos de Windows. |
| Formato PHP | Rutas, serialización anidada, caracteres UTF-8, objetos sin ejecutar y protección del importador superados. |
| Transferencias reales | 9 comprobaciones: duplicación de sitio activo, recuperación de copia anterior como proyecto nuevo, importación desde carpeta con espacios y acentos, independencia de datos y accesos, importación del exportador Mac 0.2.0-beta.1, rechazo de daños, conservación del destino fallido, reapertura con acceso y cierre de servicios. |
| Formulario Electron e IPC | Duplicación, recuperación e importación completadas en el renderer y proceso principal reales, con accesos ficticios y limpieza de los campos. Selector suministrado de forma controlada durante estas pruebas. |
| Selector nativo Mac | En la aplicación empaquetada 0.3.0-beta.2 se eligió una carpeta exportada ficticia. El asistente mostró copia 1, WordPress 7.1.3 y 2 paquetes, antes de introducir datos de acceso. |
| Actualización de sitio anterior | Sitio ficticio creado con el código y el motor Mac 0.2.0-beta.1: contenido, configuración y acceso cifrado conservados con el nuevo motor. |
| Actualizador del plugin | Beta.1 reconocida, versión anterior conservada, nuevo plugin activo y sitio accesible. Un plugin modificado se rechaza sin sustituirlo. Los archivos del ZIP público 0.3.0-beta.1 de GitHub coinciden exactamente con la entrada de compatibilidad añadida. |
| Llavero real | Cifrado y lectura comprobados; un segundo proceso de Electron recupera el acceso tras cerrar el primero. No se guarda ni imprime la contraseña aleatoria en claro. |
| Migración por el plugin | Dos WordPress reales en el Mac, dominio y prefijo de tablas diferentes, subida repetible, rechazo de paquetes dañados, cambio de dominio en campos serializados, archivo de 5 MB dividido y administrador conservado. Recuperación de tablas, archivos sustituidos y archivos añadidos superada. |
| Motor extraído del DMG | WordPress creado con los componentes del DMG: administrador real, plugin activo, copia/duplicación, importador PHP y persistencia tras cerrar y reabrir el motor. |
| Manuales | HTML en 1050 y 420 píxeles sin desbordamiento. Acceso desde Ayuda al manual local incluido en el DMG comprobado en el navegador. |
| Integridad del DMG final | hdiutil verify: VALID. Código empaquetado idéntico a 37 archivos del proyecto y su licencia; 58 ejecutables y bibliotecas nativas coinciden con las huellas preparadas. Sin dependencias nativas de Homebrew ni de rutas externas al paquete, salvo las bibliotecas del sistema. Los cuatro archivos de manuales y los recursos de migración coinciden con los preparados. |

## Incidencias corregidas

Los sockets Unix tienen un límite de longitud. Una carpeta de proyectos larga provocaba el rechazo antes de iniciar la base de datos. El adaptador Mac utiliza ahora un directorio temporal privado identificado por el perfil cuando lo necesita y verifica propietario y permisos. Los recorridos reales se ejecutaron en rutas largas con espacios y acentos.

El manifiesto del motor anterior no declaraba la versión de WordPress. La nueva preparación registra 7.1.3 para que la importación rechace por adelantado una copia de un núcleo posterior.

El selector nativo de archivos de Mac no habilitó la apertura del índice JSON durante la comprobación manual. El flujo Mac se adapta a seleccionar la carpeta exportada completa. Se conserva la comprobación de nombre, tamaños, integridad y formato antes de importar; Windows mantiene su selector del archivo índice.

## Límites

- No se ha reiniciado macOS ni se ha probado en un Mac limpio.
- Falta firma Developer ID, notarización y validación de una descarga bajo Gatekeeper en otro equipo. La consulta del llavero devolvió cero identidades válidas; no se solicitan ni se guardan credenciales de Apple.
- No se ha instalado en Aplicaciones ni sustituido una instalación personal. Se comprueba la conservación con perfiles ficticios y con el motor de la beta anterior.
- El código nuevo no se ha ejecutado en Windows. El informe Windows del repositorio corresponde a su versión anterior publicada.
- Pendiente intercambio físico de paquetes entre este Mac y el PC Windows; el formato 1 se mantiene y se comprueba con exportaciones de Mac actuales y anteriores.
- No se ha probado un hosting externo, Multisite, todos los plugins/temas ni los tamaños máximos del formato. El ensayo de archivo dividido utiliza 5 MB.
- Las pruebas conservan carpetas ficticias en .local; no se incluyen sitios, bases de datos, accesos ni paquetes de pruebas en la entrega pública.

Autoría: danimcasas.com e iNextalent.com. GPL v2 o posterior; las dependencias conservan sus licencias.
