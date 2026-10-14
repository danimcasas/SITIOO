# Estado de la preparación de SignPath

Actualizado el 15 de octubre de 2026. El repositorio [danimcasas/SITIOO](https://github.com/danimcasas/SITIOO) es público. La beta Windows disponible sigue sin firma. La aceptación del proyecto y el certificado de SignPath Foundation están pendientes.

## Preparado en el repositorio

- Workflow manual de Windows con ensayo sin firma y modo SignPath bloqueado si faltan su configuración, certificado o credenciales.
- Secuencia de cuatro etapas: auxiliar propio, aplicación Electron, desinstalador e instalador. El auxiliar se firma antes de generar el ZIP y el manifiesto del plugin.
- Configuraciones XML con nombres de archivo concretos, ProductName SITIOO y ProductVersion igual a la versión del paquete.
- Comprobación de firma de Windows, sello de tiempo, certificado esperado y conservación del contenido ejecutable. No hay alternativa silenciosa sin firma.
- Verificación de integridad del plugin y de que los binarios del motor de terceros no cambian.
- Descargas fijadas por hash. La URL del runtime Microsoft apunta a una descarga concreta; se conserva el hash revisado de la beta original.
- Política pública de firma, privacidad y enlaces desde la landing. Verificación en dos pasos de GitHub comprobada.

La [guía de compilación y firma](COMPILACION-FIRMADA.md) describe los pasos, variables, restricciones y separación entre ensayo y producción. Los ensayos prueban la preparación técnica; no prueban una firma real de un servicio todavía no habilitado.

## Datos para la revisión de SignPath

SITIOO utiliza GPL v2 o posterior. Existe una beta distribuible, una [página de descarga](https://danimcasas.com/sitioo-wordpress-local/) y código revisable con documentación. La publicación inicial del repositorio no acredita una comunidad ni un número de descargas. No se aportan cifras de adopción ni reseñas independientes sin verificar.

Se solicita al programa gratuito que valore expresamente:

1. El ejecutable de aplicación basado en Electron, los instaladores NSIS y el auxiliar propio. PHP, MariaDB y las DLL de terceros quedan fuera de la firma propia.
2. El runtime Microsoft redistribuido junto a PHP/MariaDB y enlazado con el auxiliar, bajo la excepción de bibliotecas del sistema prevista en sus condiciones. Se mantienen los avisos originales.
3. Las conexiones que pueden realizar WordPress y sus plugins, descritas en [PRIVACIDAD.md](PRIVACIDAD.md). El código propio de SITIOO no incorpora telemetría; WordPress puede comprobar versiones y descargar recursos. La beta actual no ofrece un interruptor general de red en el instalador. Si SignPath exige uno para aceptar este comportamiento, deberá implementarse y probarse antes de firmar una entrega.
4. La reputación verificable de un proyecto que acaba de abrir su código al público.

Estos puntos se declaran para revisión; no se afirma que SignPath haya confirmado el cumplimiento.

## Activación pendiente

Tras la aceptación, el responsable debe completar la cuenta, su verificación en dos pasos y la política de aprobación humana de cada firma. Los identificadores y el certificado serán los facilitados por SignPath; el token se guardará exclusivamente en Secrets de GitHub. La cuota de almacenamiento debe comprobarse antes de ejecutar firmas reales para mantener el gasto en cero.

La primera compilación con firmas reales deberá superar de nuevo la verificación de firmas e integridad y las pruebas de instalación, apertura, motor, actualización y desinstalación en Windows 11. No se reemplazarán las descargas actuales hasta completar esa comprobación. Los límites previos relativos a Windows limpio, reinicio de Windows y Mac físico continúan descritos en [PRUEBAS-WINDOWS.md](PRUEBAS-WINDOWS.md).

## Documentación y condiciones

- [Code signing policy](CODE-SIGNING-POLICY.md).
- [Privacidad](PRIVACIDAD.md).
- [Licencias y avisos](../licenses/LEEME-LICENCIAS.txt).
- [Condiciones de SignPath Foundation](https://signpath.org/terms).
- [Formulario gratuito](https://signpath.org/apply).

El formulario exige aceptar las condiciones y el tratamiento de los datos del responsable. La documentación pública no contiene esos datos de contacto. La preparación técnica no contrata servicios ni crea un certificado.
