# SITIOO

**Tu web empieza aquí.** Crea sitios WordPress en tu ordenador, guarda copias y prepara su traslado a tu hosting con SITIOO Migration.

Creado por **danimcasas.com e iNextalent.com**. El código de SITIOO se distribuye con licencia **GPL v2 o posterior**. Cada componente de terceros conserva su licencia y sus atribuciones.

## Estado de esta versión

La [página oficial de SITIOO](https://danimcasas.com/sitioo-wordpress-local/) ofrece las descargas de Mac y Windows, el plugin independiente y los manuales.

**SITIOO 0.3.0-beta.1 para Windows 11 x64** incluye un instalador guiado por usuario y los componentes necesarios: Electron 44.7.0, PHP 8.4.26, MariaDB 11.4.13, WordPress 7.1.3, WP-CLI 2.12.0 y SITIOO Migration 0.3.0-beta.1. El usuario final no necesita instalar Node.js, PHP o MariaDB por separado.

**El instalador Windows actual no tiene firma digital.** Está probado en un PC Windows 11; las pruebas en Windows limpio, después de reiniciar Windows y de intercambio con un Mac físico siguen pendientes. Consulta el [informe de pruebas](docs/PRUEBAS-0.3.0-beta.1.md) antes de usar la beta con un proyecto importante.

La [descarga de 0.3.0-beta.1 en GitHub](https://github.com/danimcasas/SITIOO/releases/tag/v0.3.0-beta.1) reúne el instalador, el plugin, los manuales, las fuentes y los resultados de las pruebas. Se conserva la [versión anterior 0.2.0-beta.2](https://drive.google.com/drive/folders/1McVHHVZ9iR8Lze_AZVtlqkvhtNwv3dp_). Los motores y los datos de proyectos quedan fuera del historial de código.

## Funciones

- Proyectos WordPress independientes, inicio y parada local, acceso a wp-admin.
- Claves del motor cifradas con DPAPI por cuenta de Windows; accesos opcionales con safeStorage. Sin alternativa en texto plano.
- Procesos supervisados por objetos Job de Windows; sin servicios generales ni cierres por nombre de proceso.
- Plugin de migración incluido y activo en nuevos proyectos. Instalación/actualización confirmada en existentes, con comprobación de hashes y conservación de la versión anterior.
- Copias numeradas creadas por SITIOO y exportación en formato 1.
- Duplicación del estado actual de un proyecto, recuperación de una copia anterior e importación de paquetes desde la aplicación. Las tres operaciones crean un proyecto independiente y conservan el origen.
- Nuevo administrador elegido por el usuario, accesos opcionales cifrados y plugins importados inactivos para revisión. El nuevo sitio queda detenido.
- Importación, cambio de dominio y recuperación de migración en un hosting desde el plugin en WordPress.
- Actualización y desinstalación conservan los datos de la aplicación por defecto.

## Documentación

- [Manual de la aplicación](docs/manual-app.html): instalación, sitios, accesos, copias y conservación.
- [Manual del plugin](docs/manual-plugin.html): requisitos, importación, cambio de dominio y recuperación.
- [Glosario y preguntas frecuentes](docs/glosario-faq.html).
- [Compilar y probar en Windows](docs/WINDOWS-11.md): herramientas, versiones y pasos.
- [Formato de migración](docs/MIGRACION.md) y [accesos locales](docs/ACCESOS-LOCALES.md).
- [Pruebas de Windows](docs/PRUEBAS-WINDOWS.md) y [registros históricos de Mac](docs/PRUEBAS.md).
- [Historial de cambios](CHANGELOG.md), [licencia](LICENSE) y [avisos de terceros](licenses/LEEME-LICENCIAS.txt).

Los manuales HTML se pueden descargar y abrir junto con `docs/manual.css`, o consultar en el paquete de documentación enlazado desde la página oficial.

La beta no incluye creación específica de WooCommerce, Multisite, actualización automática de SITIOO, reparación automática de instalaciones incompletas ni copias autónomas del hosting desde el plugin. SITIOO crea las copias; el plugin importa los paquetes y permite recuperar la migración. Los paquetes contienen datos y código sin cifrar: deben conservarse de forma privada.

## Código compartido con Mac

La interfaz, registro de proyectos, bóveda de accesos, copias, formato y plugin siguen compartidos. `packages/engine/local.cjs` selecciona `windows.cjs` o `mac.cjs`. El motor Mac original se conserva separado y mantiene su empaquetado. Estos cambios no equivalen a una nueva validación ejecutada en Mac.

Los registros históricos de Mac corresponden a las versiones que indican. La publicación del código no supone una nueva validación en Mac ni una nueva compilación del instalador Windows.

## Code signing policy

Se está preparando la solicitud al programa gratuito de SignPath Foundation. El proyecto todavía no está aceptado y no se han emitido firmas para SITIOO. El [proceso de compilación y firma](docs/COMPILACION-FIRMADA.md) incluye un ensayo sin certificado y una modalidad que exige firmas válidas. Consulta la [política de firma](docs/CODE-SIGNING-POLICY.md), la [información de privacidad](docs/PRIVACIDAD.md) y el [estado de la solicitud](docs/SIGNPATH.md).

## Colaborar

Puedes abrir una incidencia o proponer un cambio en este repositorio. Utiliza ejemplos ficticios y evita adjuntar contraseñas, sitios reales, bases de datos o registros con información privada. El mantenimiento del repositorio corresponde a [danimcasas](https://github.com/danimcasas).
