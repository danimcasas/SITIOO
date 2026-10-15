# Pruebas y límites de SITIOO 0.3.0-beta.1

Fecha: 15 de octubre de 2026. Desarrollo y pruebas en el PC Windows autorizado, con sitios y datos ficticios. Este informe documenta la validación local del instalador distribuido en [0.3.0-beta.1](https://github.com/danimcasas/SITIOO/releases/tag/v0.3.0-beta.1). Se conserva la descarga anterior.

## Entorno

Windows 11 Home x64, versión 10.0.26300; PowerShell 7.6.5; Node.js 24.12.0; Electron 44.7.0; PHP 8.4.26; MariaDB 11.4.13; WordPress 7.1.3 y WP-CLI 2.12.0. Se reutilizaron las herramientas y componentes locales existentes. No se añadieron dependencias ni se contrataron servicios.

Las rutas de prueba contienen espacios y acentos. La instalación se ejecutó por usuario en una carpeta de pruebas, mediante la opción silenciosa del instalador. La aplicación instalada se abrió realmente y se comprobó su motor incluido. Las pruebas no utilizan el Mac ni un entorno Linux remoto.

## Nuevas operaciones

| Prueba | Pasos | Resultado esperado | Resultado observado | Estado |
| --- | --- | --- | --- | --- |
| Duplicar un sitio activo | Crear contenido ficticio, activar un plugin ficticio y duplicar | Nuevo sitio independiente; original disponible y sin cambios | Contenido copiado, URL y base propias; original activo y accesible | Superada |
| Recuperar una copia anterior | Guardar estado uno, cambiar el origen a estado dos y recuperar la primera copia | Nuevo proyecto con estado uno; original conserva estado dos | Datos y archivos corresponden a cada versión; se conservan las copias | Superada |
| Importar una carpeta exportada | Exportar una copia, seleccionar su índice e importar en una ruta con espacios y acentos | Nuevo proyecto local con enlaces adaptados | Contenido, archivos, direcciones y datos serializados comprobados | Superada |
| Acceso propio y cifrado | Elegir otro administrador y guardar su acceso | Entrada válida en wp-admin sin claves guardadas en texto plano | Inicio real de sesión y lectura posterior del acceso cifrado | Superada |
| Plugins importados | Comparar archivos y lista de plugins activos | SITIOO Migration activo; otros plugins conservados e inactivos | Archivos idénticos y lista de activación comprobada | Superada |
| Independencia del duplicado | Cambiar una opción del duplicado y comprobar el origen | Ningún cambio en datos ni accesos del origen | Datos originales y archivos cifrados permanecen iguales | Superada |
| Paquete alterado | Modificar bytes sin cambiar el tamaño declarado | Rechazo antes de crear un proyecto | Operación rechazada; número de proyectos sin cambios | Superada |
| ZIP inválido con suma coincidente | Preparar un ZIP inválido, actualizar su suma y ejecutar la importación | Fallo contenido en el destino nuevo; original utilizable | Destino marcado para revisión, archivos conservados, procesos detenidos y origen accesible | Superada |
| Reapertura | Cerrar el motor, cargar el registro y abrir todos los sitios correctos | Persisten sitios, datos y accesos | Inicio real en todos los administradores con los accesos guardados | Superada |
| Interfaz de las tres funciones | Pulsar los botones y completar los formularios reales | Cada operación crea su proyecto y limpia el campo de contraseña | Las tres operaciones completadas mediante renderer, preload y canal IPC reales | Superada |

La selección nativa del archivo se suministró de forma controlada a la prueba de interfaz. No se atribuye una prueba manual al diálogo de archivos. Se revisaron capturas en ventana normal y estrecha, sin desbordamiento horizontal.

## Regresión, formato e instalador

| Prueba | Pasos | Resultado esperado | Resultado observado | Estado |
| --- | --- | --- | --- | --- |
| Pruebas automatizadas | Ejecutar las pruebas de Node | Sin fallos aplicables a Windows | 38 pruebas: 34 superadas, 4 omitidas por corresponder a instalación en Mac, 0 fallidas | Superada |
| Formato PHP | Probar serialización, rutas, colisiones y nombres de Windows | Reemplazos seguros y rechazo de entradas incompatibles | Comprobaciones del formato actual superadas | Superada |
| Paquetes anteriores | Exportar con el código real de 0.2.0-beta.2 e importar con 0.3.0-beta.1 | Mantener el formato 1 | Importación funcional, datos y acceso comprobados | Superada |
| Lector original beta.1 | Comprobar los paquetes nuevos con sus funciones de formato originales | Tablas, bloques, rutas y sumas compatibles | 12 tablas, 2 paquetes, 454 bloques, de ellos 444 de archivos | Superada en Windows |
| Motor y dos sitios | Crear dos sitios; comprobar datos, accesos, parada y reapertura | Independencia y cierre de procesos propios | Las diez comprobaciones del recorrido Windows superadas | Superada |
| Protección de accesos | Probar DPAPI real, permisos privados y cifrado no disponible | Error sin alternativa en texto plano | Se rechaza el guardado inseguro y se recuperan accesos cifrados válidos | Superada |
| Procesos ajenos | Ocupar un puerto con otro servidor ficticio e iniciar el proyecto | Error de puerto; servidor ajeno permanece activo | El otro servidor responde después del rechazo | Superada |
| Plugin en sitio existente | Instalar, actualizar una versión reconocida e intentar sustituir una modificada | Conservar contenido y versión anterior; bloquear la desconocida | Comportamiento comprobado con contenido ficticio | Superada |
| Migración del plugin | Exportar, importar con otro dominio/prefijo, interrumpir y recuperar | Contenido correcto y recuperación del destino | Dominio y prefijo distintos, interrupciones simuladas y recuperación de tablas y archivos comprobados | Superada |
| Integridad de la compilación | Comparar fuentes del programa y binarios de terceros | Coinciden las fuentes; terceros intactos | 37 archivos de apps/packages/config idénticos; 123 binarios de terceros sin cambios; plugin y auxiliares coincidentes | Superada |
| Actualización del programa | Instalar 0.2.0-beta.2 en una carpeta nueva y ejecutar el EXE 0.3.0-beta.1 sobre ella | Actualización y conservación del perfil ficticio | Los 43.470 archivos comparados mantienen sus sumas | Superada |
| Aplicación instalada | Abrir SITIOO.exe instalado e iniciar los tres sitios creados desde la interfaz | Motor incluido, acceso cifrado a wp-admin y parada real | Versión 0.3.0-beta.1 y las cuatro comprobaciones del ejecutable instalado superadas | Superada |
| Desinstalación | Cerrar la aplicación, comparar los datos y ejecutar su desinstalador | Se retira la aplicación y se conservan los datos | Los 43.496 archivos de sitios, accesos, copias y preparación mantienen sus sumas; ejecutable de prueba retirado | Superada |

Las pruebas del instalador usan un perfil ficticio aislado. La actualización 0.2.0-beta.2 → 0.3.0-beta.1 se verifica sobre la instalación de prueba; el perfil utilizado contiene sitios creados durante esta ejecución. No se ha utilizado ni inspeccionado un sitio personal como muestra.

## Incidencias corregidas

La primera ejecución de duplicación detectó una dirección de WordPress incorrecta: su cálculo desde consola incorporaba parte de una ruta larga de Windows. Se fijaron explícitamente home y siteurl después de instalar WordPress. Se repitió el recorrido completo: duplicación, recuperación, importación, acceso, reapertura y pruebas de interfaz. Los intentos y archivos de diagnóstico se conservan en la carpeta local de pruebas.

## Evidencias

La carpeta de entrega incluye resultados JSON sin contraseñas, capturas de la interfaz y del ejecutable instalado, el informe de compilación y este documento. Los sitios, bases de datos, copias de migración y credenciales ficticias utilizadas en los ensayos quedan fuera de la entrega y del archivo de fuentes.

Las capturas se revisaron visualmente. Los manuales se comprobaron a 1050 y 420 píxeles de anchura, sin desbordamiento horizontal. El ZIP de fuentes excluye dependencias locales, datos, perfiles, cachés y registros privados.

## Pendientes y limitaciones

- Windows limpio y reinicio de Windows: pendientes. Se ha reiniciado la aplicación y su motor; no se ha reiniciado el PC.
- Ejecución física en Mac e intercambio real entre ambos sistemas: pendientes. Se conserva el formato 1 y se comprueba su contrato en Windows.
- Recorrido manual de las ventanas del asistente y del selector nativo de archivos: pendiente. Se probó la instalación silenciosa y se controló el selector durante las pruebas automatizadas.
- El nuevo destino queda detenido. SITIOO Migration está activo; los otros plugins requieren revisión y activación por el usuario.
- Las cuentas de WordPress incluidas en la base de datos se conservan. Si el administrador elegido ya existe en la copia, el destino recibe la nueva contraseña elegida para ese nombre.
- Una importación interrumpida en la aplicación conserva el destino incompleto y permite repetir la operación como otro proyecto. La continuación automática de ese destino no está implementada. El plugin conserva su recuperación de migración en WordPress.
- Las carpetas de preparación y los intentos fallidos se conservan y ocupan espacio. No hay limpieza automática.
- Se admite el formato 1 de SITIOO, con WordPress individual y una versión igual o anterior a la incluida. Multisite, vistas, restricciones especiales, enlaces simbólicos y otros formatos de copia siguen fuera del alcance.
- No se han probado todos los temas, plugins, hostings ni los tamaños máximos del formato.
- El instalador está **sin firma digital**. SignPath sigue pendiente; esta compilación utiliza el modo explícito de ensayo y no solicita firmas ni servicios de pago.
- La publicación y sus enlaces se verifican por separado de estas pruebas de funcionamiento. Los resultados anteriores corresponden al instalador sin modificar, preparado el 15 de octubre de 2026.

Autoría: danimcasas.com e iNextalent.com. GPL v2 o posterior; licencias de terceros conservadas.
