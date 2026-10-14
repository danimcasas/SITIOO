# Privacidad de SITIOO y SITIOO Migration

Información del funcionamiento de SITIOO 0.2.0-beta.2 para Windows, revisada el 15 de octubre de 2026.

SITIOO guarda los proyectos WordPress y sus copias en el ordenador. La revisión del código propio no ha encontrado analítica, publicidad ni envío automático de informes a los autores. No exige crear una cuenta de SITIOO. La revisión de código no constituye una captura completa del tráfico de todos los componentes.

## Qué se guarda en el equipo

Los proyectos y accesos se almacenan normalmente en `%APPDATA%\SITIOO`, separados de la carpeta del programa. Cada proyecto tiene su base de datos y sus servicios escuchan en la dirección local del equipo.

Los accesos guardados por SITIOO y los secretos del motor se cifran con el almacenamiento seguro asociado a la cuenta de Windows. Si falla el cifrado, la operación debe detenerse con un error. No se contempla guardarlos en texto plano como alternativa.

El contenido de WordPress, sus bases de datos y las copias no se cifran mediante ese mecanismo de accesos. Contienen los datos que se introduzcan en los sitios. Es necesario proteger el equipo, la sesión de Windows y las copias.

## Conexiones a otros servicios

La interfaz propia de SITIOO se carga desde archivos locales. La beta no incorpora un actualizador automático propio.

WordPress puede contactar con WordPress.org para comprobar versiones del núcleo, temas y plugins, y obtener recursos. Los temas, plugins y contenidos que se utilicen también pueden contactar con servicios externos. SITIOO no bloquea de forma general las conexiones salientes. La [política de WordPress.org](https://wordpress.org/about/privacy/) explica el tratamiento de información de sus servicios, incluida su API.

La instalación local incluye un filtro para impedir el correo enviado por el mecanismo estándar de WordPress. Algunos plugins pueden usar mecanismos externos distintos; el filtro no bloquea todo el tráfico de terceros.

La comprobación de red de una instalación nueva y la evaluación de un aviso u opción adicional en el instalador forman parte de los [trabajos pendientes para SignPath](SIGNPATH.md).

## Exportación y migración

SITIOO crea copias y paquetes exportados en la ubicación elegida. Pueden contener datos personales del sitio, usuarios y código. **Los paquetes no están cifrados y no deben publicarse.**

SITIOO Migration sube los archivos seleccionados al WordPress de destino donde se ejecuta el plugin. Las peticiones de importación se realizan contra ese sitio. Su hosting y sus componentes tratarán el contenido conforme a su configuración y políticas.

El plugin conserva el contenido anterior y el estado de la operación para permitir la recuperación. Esos archivos también necesitan protección. El plugin no crea copias autónomas del hosting.

## Conservación

Actualizar o desinstalar SITIOO conserva por defecto los sitios y accesos. La retirada del programa tampoco elimina las copias exportadas. El usuario administra esas copias y los datos que haya trasladado a un hosting u otro destino.

## Web y contacto del proyecto

Las descargas, la web y los servicios de alojamiento tienen sus propias políticas. Este documento describe la aplicación y el plugin; no sustituye las condiciones de Google Drive, GitHub ni del hosting elegido por el usuario.

El proyecto mantiene la autoría **danimcasas.com e iNextalent.com**. Las consultas pueden dirigirse por el canal de contacto de la [página oficial](https://danimcasas.com/sitioo-wordpress-local/). Los informes públicos de problemas deben utilizar datos ficticios y evitar contraseñas, bases de datos o registros privados.

Las referencias al cifrado de Windows corresponden a esta versión. La versión Mac usa mecanismos propios descritos en [ACCESOS-LOCALES.md](ACCESOS-LOCALES.md).
