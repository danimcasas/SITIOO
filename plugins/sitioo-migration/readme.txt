=== SITIOO Migration ===
Contributors: danimcasas
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.3.0-beta.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Creado por danimcasas.com e iNextalent.com.

== Descripción ==
Importa los ZIP exportados por SITIOO. Sube bloques pequeños, verifica integridad y adapta direcciones y tablas al WordPress de destino. Conserva el administrador del hosting y originales para recuperación. Beta para pruebas; no se ha validado en todos los hostings.

== Instalación ==
Instala y activa el ZIP desde Plugins. Abre Herramientas → SITIOO Migration y selecciona el manifiesto y los ZIP de datos. Revisa origen y destino antes de confirmar. El WordPress de destino debe tener una versión igual o posterior a la de la copia. Necesita ZipArchive, InnoDB, permisos de tablas y escritura en wp-content y una carpeta privada fuera del directorio público.

== Alcance ==
WordPress individual. No importa wp-config.php, core, reglas del servidor, mu-plugins ni drop-ins. Los plugins importados quedan inactivos para revisión. Guarda los paquetes de forma privada; contienen datos y código. No elimines el plugin ni sus archivos temporales durante la migración. Para conservar recuperación fuera del directorio temporal, configura SITIOO_PRIVATE_DIR en wp-config.php con una carpeta privada persistente.

== Cambios ==
= 0.3.0-beta.1 =
Incluido y activado en los sitios nuevos de SITIOO. Protección de carpetas privadas en Windows x64, comprobación de rutas incompatibles y conservación del formato de paquetes 1.

= 0.2.0-beta.1 =
Primera versión de migración por paquetes, con recuperación del estado anterior.


== Windows y alcance de esta versión ==
En Windows x64 se necesitan mbstring y proc_open para aplicar permisos privados mediante el ayudante incluido. Si falla la protección, se detiene la operación. El ZIP incluye native/sitioo-win.cpp, GPL v2 o posterior, y su compilación requiere MSVC/Windows SDK; el usuario del plugin no necesita compilarlo. Windows no admite nombres reservados ni rutas que solo se diferencien por mayúsculas.
SITIOO crea las copias; el plugin importa y recupera migraciones. No crea copias autónomas del hosting. Formato de paquetes 1, compartido con Mac. Las combinaciones reales probadas se describen en el informe de la beta.
