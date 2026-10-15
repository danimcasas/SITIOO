# Migración — SITIOO 0.3.0-beta.1

La guía de uso completa está en `manual-app.html` y `manual-plugin.html`.

SITIOO crea copias numeradas y exporta manifiesto y ZIP. SITIOO Migration importa esos paquetes y permite recuperar el estado anterior del destino. El plugin no crea copias autónomas del hosting.

Se conserva FORMAT=1. El manifiesto, esquemas, filas codificadas y entradas ZIP mantienen el contrato de beta.1 para Mac. Los nombres de contenido se escriben siempre con `/`; las rutas absolutas de origen se conservan como datos para sustituirlas por la ruta del destino. No se exportan los secretos del motor, la bóveda de accesos, wp-config.php, el núcleo, mu-plugins, drop-ins ni el propio importador.

Windows añade permisos ACL privados, comprobación de rutas reservadas y colisiones de mayúsculas. El plugin incluye su ayudante x64 y su fuente GPL. En Windows exige proc_open y mbstring; falla si no puede proteger la recuperación. Linux/macOS conservan su control de permisos 0700. La validación de contrato en Windows no equivale a ejecución física en Mac.

El destino necesita WordPress igual o posterior al origen, PHP >=8.1, ZipArchive, InnoDB y permisos para crear/renombrar tablas. No se admite Multisite ni tablas de usuarios externas. Límites: suma de tamaños comprimidos y expandidos <20 GiB; archivos <=2 GiB; bloques <=4 MiB. Ver manual para espacio libre y límites de SQL/serialización. Estos límites no implican prueba de carga máxima.

El administrador del destino, su dominio y su configuración se conservan. Los plugins importados quedan inactivos hasta revisión. La recuperación restaura tablas y archivos guardados por esa migración; puede sustituir cambios posteriores. No hay limpieza automática de recuperaciones.

El ZIP del plugin se incluye en la aplicación y se entrega separado. El alta de proyectos instala/activa su copia incluida. En proyectos existentes, PluginManager verifica archivos contra índices conocidos; conserva el plugin anterior fuera de la raíz pública y bloquea versiones desconocidas o modificadas.


## Recuperación local desde SITIOO 0.3.0-beta.1

La aplicación permite duplicar un sitio, recuperar una copia de su historial e importar una carpeta exportada como proyecto nuevo. La selección nativa abre sitioo-manifest.json junto a todos sus ZIP. La aplicación verifica el índice, tamaños y SHA-256 y prepara una copia privada antes de ejecutar el importador compartido. El formato sigue siendo 1.

El destino recibe nuevas claves del motor y el administrador elegido por el usuario. No se copian claves DPAPI ni la bóveda de accesos del origen. El proyecto queda detenido; SITIOO Migration activo y otros plugins inactivos para revisión. Se adaptan las direcciones y datos serializados compatibles. Los archivos de preparación e intentos fallidos se conservan. Si se interrumpe, se puede repetir como otro proyecto; la reanudación desde la aplicación está pendiente.
