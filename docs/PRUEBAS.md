# Pruebas ejecutadas — beta 0.1.0-beta.1

> Registro histórico procedente del desarrollo en Mac. Sus ampliaciones describen las versiones indicadas en cada sección. Para Windows 0.2.0-beta.2, consultar [PRUEBAS-WINDOWS.md](PRUEBAS-WINDOWS.md). La publicación de este documento no implica repetir estas pruebas.

Fecha: 13 de octubre de 2026. Entorno: macOS 26.6.2, Apple Silicon.

## Lógica crítica

`npm test`: **9 superadas, 0 fallidas**.

Argumentos sin shell; errores sin salida sensible; puerto local no privilegiado; espera de disponibilidad; exclusión de operaciones simultáneas; límite de rutas de sockets; validación de datos; prevención de escape de rutas; persistencia y conservación de registro corrupto.

El primer intento aislado no pudo abrir un puerto por EPERM. La repetición autorizada fuera del aislamiento pasó. No se ocultó ese fallo como un éxito del primer intento.

## Integración WordPress

`scripts/test-integration.cjs`: **superado**.

- Inicialización real de MariaDB e instalación de WordPress mediante WP-CLI.
- Respuesta HTTP 200 de página principal y acceso de administración.
- Parada con servidor inaccesible y reinicio con HTTP 200.
- Instalación/activación de Hello Dolly por HTTPS.
- Instalación/activación de Twenty Twenty-Four por HTTPS.
- Comprobación oficial de archivos de WordPress con `core verify-checksums --locale=es_ES`.

Se detectaron y corrigieron fallos de MariaDB y WP-CLI con espacios en rutas y una URL de instalación incorrecta. Solo la ejecución posterior a esas correcciones se considera superada.

## Autenticación, varios proyectos y persistencia

`scripts/test-beta.cjs`: **superado**, tanto con el motor de desarrollo como con el motor extraído del DMG.

- Contraseña de prueba aleatoria mantenida en memoria durante la prueba.
- Login HTTP real: redirección, cookie de sesión y acceso autenticado a wp-admin.
- Texto «Escritorio» comprobado en el administrador español.
- Dos proyectos con identificadores, puertos y contenidos propios activos a la vez.
- Cierre del motor, nueva lectura del registro y reapertura del primer sitio.
- Contenido de WordPress conservado.

La prueba con el motor del DMG también pasó con PATH limitado a /usr/bin:/bin. Node se utilizó como conductor externo de las pruebas, no como dependencia del motor distribuido. La aplicación incluye su ejecución JavaScript mediante Electron.

## Procesos y empaquetado

- Guardián comprobado con un proceso real: al cerrarse su canal con el padre, termina el grupo supervisado.
- El cierre forzado completo de Electron durante una instalación sigue pendiente de una prueba integral.
- DMG creado mediante electron-builder, comprobado con hdiutil, montado y aplicación copiada fuera del volumen a una carpeta de prueba.
- Aplicación extraída abierta: el panel en español se observó mediante Computer Use, sin aviso de motor ausente.
- 58 archivos Mach-O del motor inspeccionados: ninguna biblioteca requerida ausente ni dependencia dinámica externa a lo incluido o a las bibliotecas del sistema.
- La última reconstrucción solo ajustó la versión mínima declarada de macOS a 26.0. Los recursos de aplicación y motor se comparan con la copia que pasó la prueba.

## Dependencias y fuentes

Paquetes MariaDB y dependencias descargadas contrastados con SHA-256 publicado en la API de Homebrew. PHP y otras bibliotecas se copiaron de la instalación existente del equipo y se reubicaron; aún falta una cadena de construcción nativa completamente reproducible.

WordPress descargado del sitio oficial español y verificado con WP-CLI. WP-CLI descargado por HTTPS desde el repositorio oficial de builds; su autenticidad no se ha comprobado mediante una firma independiente.

La instalación npm informó 8 vulnerabilidades moderadas en dependencias de desarrollo. `npm audit --omit=dev` informó cero, pero no constituye una auditoría del motor nativo ni una garantía de seguridad de Electron. La revisión de herramientas de construcción queda pendiente antes de distribución pública.

Referencias consultadas:

- MariaDB en macOS: https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/installing-mariadb/binary-packages/installing-mariadb-on-macos-using-homebrew
- Paquetes Homebrew: https://formulae.brew.sh/formula/mariadb@11.4
- Servidor de desarrollo PHP: https://www.php.net/commandline.webserver

## No comprobado / no implementado

Instalación en Mac limpio; firma Developer ID; notarización; descarga y Gatekeeper; recorrido manual completo de creación desde la interfaz empaquetada; Mac Intel; Windows; WooCommerce; copias; restauraciones; exportación; eliminación; actualización sin pérdida; trabajo sin conexión; plugins distintos a los probados; pagos y webhooks externos.

Los directorios de prueba se conservan bajo .local. Ninguna credencial de prueba se incluye en el DMG.

## Actualización beta 2

14 pruebas de lógica superadas. Cinco nuevas comprobaciones cubren perfil de pruebas sin instalación, cancelación, prueba sin instalar, reinicio tras copia y protección de una aplicación existente. Usan dobles de Electron: no sustituyen la prueba real de copia a Aplicaciones.

El DMG beta 2 se ha montado correctamente con verificación de integridad. Se ha comprobado la presencia de .VolumeIcon.icns, el icono declarado en Info.plist y el enlace a Aplicaciones. El fondo de instrucciones se ha inspeccionado visualmente. La aplicación empaquetada se ha abierto y el asistente de creación se ha observado con su nuevo icono y versión.

El motor no ha cambiado respecto a la beta 1; sus pruebas de integración documentadas anteriormente no se han repetido innecesariamente en esta entrega. No se ha ejecutado la copia real a Aplicaciones ni firma/notarización con Apple. La prueba de precondiciones del proceso de firma falla de forma controlada cuando faltan sus variables, sin crear una publicación firmada.

## Corrección de acceso al administrador — beta 3

Se ha reproducido el fallo comunicado por el usuario. En beta 2, /wp-admin/ devolvía HTTP 200 con la web pública, en vez de exigir autenticación y cargar wp-admin/index.php. La prueba anterior de login solo buscaba la palabra «Escritorio», que podía aparecer en la barra superior de la web pública. Por tanto, aquella comprobación NO acreditaba el acceso al panel real. La confirmación anterior sobre el escritorio se corrige expresamente aquí.

La prueba reforzada falló antes de la corrección (200 en lugar de 302). Después de corregir el router pasó: acceso anónimo redirigido a wp-login.php, login real, cuerpo wp-admin, contenedores wpbody y dashboard-widgets-wrap presentes, dos proyectos activos y reapertura con contenido conservado.

Se aplicó el mismo router a la copia activa del usuario, tras conservar el original. Su /wp-admin/ pasó a devolver 302 al login del mismo sitio. No se leyó ni cambió su contraseña, ni se modificaron sus archivos WordPress o su base de datos. La comprobación autenticada se realizó en proyectos ficticios separados.

Verificación final beta 3: 14 pruebas de lógica superadas; prueba reforzada test-beta.cjs superada también con el motor empaquetado; hdiutil verify confirma integridad del DMG. Las versiones anteriores y los archivos previos a la corrección se conservan.

## Accesos locales — beta 4

19 pruebas de lógica superadas: incluyen cifrado completo de usuario y contraseña, permisos de archivo 0600, lectura tras reapertura, rechazo cuando falta cifrado, actualización conservando contraseña, borrado sin modificar proyectos, aislamiento entre proyectos y recuperación de un archivo ilegible. El proveedor simulado de estas pruebas no se utiliza en producción.

Dos ejecuciones independientes de Electron con safeStorage real verificaron el llavero de macOS: guardado y lectura, ausencia de credenciales en claro en el archivo y recuperación tras cerrar y reiniciar el proceso. Las credenciales ficticias se generaron en memoria; la prueba de reinicio solo conserva una huella SHA-256 y el archivo cifrado. No se han leído ni modificado las credenciales del usuario.

El primer intento de pruebas en el entorno restringido bloqueó la apertura del puerto local (EPERM); se repitieron con permiso y pasaron. No se repite la integración de WordPress porque el motor y el router no cambian respecto a beta 3. La firma Apple, la notarización y la prueba en un Mac limpio siguen pendientes.

DMG beta 4 verificado con hdiutil verify. La aplicación empaquetada se abrió con un perfil aislado; se comprobó visualmente «Acceso a WordPress», campo de contraseña protegido, acciones desactivadas sin acceso guardado y botón de guardado disponible. Se cerró únicamente esta copia de prueba. Mostrar/copiar/guardar no se recorrieron manualmente en la interfaz; cifrado y recuperación se validaron con las pruebas descritas arriba.

## 0.2.0 beta 1 — copias y migración

- 24 pruebas Node superadas, incluidas flujo del formulario con transporte simulado, confirmación previa, reanudación de subida, numeración sin sobrescribir copias y recuperación del servidor local cuando falla una exportación.
- Pruebas PHP de sustitución de dominios con subcarpetas, texto UTF-8, JSON con barras escapadas, serialización anidada, objetos sin ejecutar métodos, rechazo de rutas peligrosas y protección del propio importador.
- Integración real con dos WordPress y bases MariaDB independientes: creación de copia, exportación ZIP, instalación del plugin en destino, inicio de sesión real, comprobación de permisos y nonce, subida en fragmentos y validación antes de sobrescribir.
- Un ZIP con SHA-256 incorrecto se rechazó sin cambiar los datos del destino. Se simularon confirmaciones perdidas durante la subida y justo después de RENAME TABLE, tanto al importar como al recuperar.
- La web migró de 127.0.0.1 a localhost en otro puerto, con cambio del prefijo wp_ a prod_. Se comprobó el contenido publicado, opciones y metadatos serializados anidados, valores predeterminados de columnas, administrador de destino conservado, respuesta pública HTTP 200 y acceso autenticado al escritorio.
- Un archivo de 5 MB se dividió en bloques, se importó y coincidió su SHA-256. La recuperación devolvió las tablas y archivos sustituidos al estado anterior, retiró archivos nuevos y conservó archivos del destino ajenos a la copia.

Durante una repetición se detectó una limitación de la preparación de pruebas: se cambiaba wp-config.php con PHP activo y su caché seguía leyendo temporalmente el prefijo anterior, mostrando el instalador. La prueba ahora reinicia PHP tras ese cambio. El importador no modifica wp-config.php. El recorrido completo posterior pasó.

No se ha probado en un hosting externo, WordPress Multisite, MySQL remoto, instalaciones grandes ni combinaciones arbitrarias de temas/plugins. No se acredita compatibilidad universal. Los límites de formato de 2 GB por archivo y 20 GB por copia no representan tamaños validados. La activación manual de plugins importados y la recuperación después de cambios externos requieren pruebas adicionales. Firma Developer ID, notarización y Mac limpio siguen pendientes.

Validación final: el recorrido real también pasó con el prefijo de destino `s`, para comprobar que las tablas temporales no entran en el conjunto que se sustituye. El DMG final pasó `hdiutil verify`. Se abrió la aplicación empaquetada en un perfil aislado, se revisaron versión, créditos e historial y se exportó una copia desde su selector nativo de carpeta. Los ZIP exportados coincidieron con las huellas del manifiesto y el plugin incluido coincidió con los fuentes comprobados. Se cerró esa copia de prueba sin tocar los proyectos del usuario.
