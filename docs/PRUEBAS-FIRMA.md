# Verificación de la preparación de firma

SITIOO 0.2.0-beta.2 · 15 de octubre de 2026.

Código de la integración: [69c429d](https://github.com/danimcasas/SITIOO/commit/69c429d4bc9574854cb4ace4c7e2bf66bce787e6). Esta revisión prepara la firma. La beta distribuida anteriormente sigue sin firma y conserva sus archivos originales.

## Entorno y alcance

Pruebas locales ejecutadas en Windows 11 Home x64, versión 10.0.26300, con PowerShell 7.6.5, Node.js 24.12.0 y Electron 44.7.0. Se usó una copia nueva del desarrollo y únicamente sitios ficticios. No se reinició Windows. La reapertura del motor descrita abajo sucede en el proceso de prueba; no acredita un reinicio de Windows ni una instalación limpia.

El ensayo de GitHub utiliza el ejecutor estándar `windows-2025`. Es una comprobación separada de construcción desde el repositorio público; no sustituye las pruebas de funcionamiento en este PC Windows 11.

## Controles de construcción y firma

| Prueba y pasos | Resultado esperado | Resultado observado | Estado |
| --- | --- | --- | --- |
| Ejecutar `npm test`, incluidos los controles del formato PE, contenido ejecutable y lista de archivos permitidos | Ningún fallo; rechazar archivos alterados o no permitidos | 31 pruebas: 27 superadas, 4 omitidas por corresponder a Mac, 0 fallidas | Superada en Windows; Mac pendiente |
| Ejecutar el modo de firma real fuera del origen autorizado de GitHub | Detenerse antes de solicitar firmas | La inicialización rechazó el entorno no autorizado | Superada |
| Verificar un auxiliar sin firma con `-RequireSignature` | Rechazar el archivo | La verificación de Windows lo rechazó | Superada |
| Construir localmente en modo `rehearsal` | Generar aplicación, auxiliar, desinstalador e instalador con producto SITIOO y versión coherente | Se generaron las cuatro etapas y el instalador de ensayo | Superada; ensayo sin firma |
| Ejecutar `check-bundle.cjs` sobre el ensayo | Manifiesto correcto, auxiliares idénticos y componentes de terceros intactos | Manifiesto verificado; dos auxiliares idénticos; 123 binarios del motor de terceros sin cambios | Superada |
| Comparar los 12 archivos del plugin de la beta.2 original con la lista de compatibilidad y consultar su estado | Ofrecer una actualización explícita para esa copia conocida | Estado `update`, permitido; original conservado | Superada |
| Ejecutar el workflow desde `main` en un ejecutor Windows nuevo de GitHub | Reproducir la construcción y los controles de integridad | [Ejecución pública](https://github.com/danimcasas/SITIOO/actions/runs/38656564086) en curso al preparar este informe | Pendiente |
| Recibir y verificar firmas reales de SignPath | Certificado autorizado, sello de tiempo y contenido ejecutable conservado | El servicio todavía no está habilitado | Pendiente de aceptación y configuración |

El ensayo verifica metadatos y construcción sin presentar los archivos como firmados. Las pruebas negativas confirman el rechazo de entradas inválidas; no acreditan una respuesta real de SignPath.

## Funcionamiento con el auxiliar actualizado

Comando: `node scripts/run-windows-tests.cjs`. Evidencia local: informe JSON generado el 14 de octubre de 2026 a las 23:53:27 UTC, equivalente al 15 de octubre en la zona horaria de las pruebas. Diez comprobaciones superadas; proceso terminado con código 0.

| Prueba y pasos | Resultado esperado | Resultado observado | Estado |
| --- | --- | --- | --- |
| Crear dos WordPress y entrar en sus paneles administrativos con cuentas ficticias | Ambos sitios operativos y plugin activo | Inicio de sesión real en ambos; SITIOO Migration instalado y activado | Superada |
| Guardar un marcador ficticio en el primer sitio y buscarlo en el segundo | Bases de datos independientes | El segundo sitio no contenía el marcador; puertos distintos | Superada |
| Guardar accesos con el cifrado de Windows, revisar permisos y simular su indisponibilidad | Secretos cifrados; error sin alternativa en texto plano | Cifrado y permisos verificados; el proveedor no disponible no creó un archivo de credenciales | Superada |
| Cerrar el motor y revisar los procesos que inició | Todos sus procesos terminados | Los procesos gestionados habían terminado | Superada |
| Abrir de nuevo el motor y recuperar accesos y datos | Mismos sitios y accesos utilizables | Ambos paneles aceptaron los accesos recuperados; contenido conservado | Superada |
| Retirar a una carpeta de conservación el plugin de un sitio ficticio e instalarlo desde SITIOO | Instalar el plugin incluido | Estado final actualizado | Superada |
| Colocar una copia conocida de beta.1 y ejecutar la actualización explícita | Conservar contenido y plugin anterior | Plugin actualizado; marcador de contenido conservado; copia anterior retenida por el gestor | Superada |
| Modificar un archivo de plugin y solicitar su sustitución | Bloquear la versión desconocida | Sustitución rechazada y archivos conservados | Superada |
| Ocupar un puerto con un servidor ficticio ajeno e intentar arrancar el sitio | Rechazar el arranque sin interrumpir el servidor ajeno | Puerto ocupado detectado; el servidor ajeno siguió respondiendo | Superada |
| Ejecutar las pruebas dentro de rutas con espacios y acentos | Crear, iniciar y recuperar sitios sin errores de ruta | Operaciones completadas en esas rutas | Superada |

## Pendientes antes de distribuir una versión firmada

- Aceptación del proyecto, habilitación de la cuenta, verificación en dos pasos y política de aprobación humana en SignPath.
- Revisión por SignPath del alcance de Electron, bibliotecas Microsoft, comportamiento de red y reputación del proyecto, según [SIGNPATH.md](SIGNPATH.md).
- Compilación con firmas reales y comprobación de certificado, sello de tiempo y contenido de los cuatro ejecutables.
- Instalación, apertura, actualización y desinstalación del nuevo instalador firmado en Windows 11, junto con las pruebas del motor y del plugin.
- Windows limpio, reinicio de Windows y comprobación en un Mac físico: no ejecutados en esta preparación. Se conservan los límites del [informe de la beta](PRUEBAS-WINDOWS.md).

No se ha sustituido el instalador público ni se ha contratado un servicio de pago. Los informes y capturas públicos excluyen cuentas de prueba, contraseñas y los datos privados del formulario.
