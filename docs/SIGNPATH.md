# Preparación para SignPath Foundation

Estado del 15 de octubre de 2026: código preparado para su publicación en [danimcasas/SITIOO](https://github.com/danimcasas/SITIOO). La solicitud de firma todavía no se ha enviado y SignPath no ha aceptado el proyecto.

El software propio utiliza GPL v2 o posterior y tiene una beta disponible en la [página de descarga](https://danimcasas.com/sitioo-wordpress-local/). Se incluyen el código, las recetas de compilación, la documentación y los avisos de terceros.

## Pendiente antes de solicitar la firma

- Aportar evidencias verificables de uso o confianza. La publicación inicial del repositorio no acredita una comunidad ni un número de descargas.
- Preparar y comprobar una compilación automática desde una revisión pública. La opción propuesta utiliza ejecutores Windows estándar de GitHub Actions, sin servicios de pago. No hay ningún workflow activado en esta publicación inicial.
- Incorporar nombre y versión de producto al ayudante `sitioo-win.exe`. El binario actual del plugin se publica junto con su fuente y receta de compilación; todavía no está firmado.
- Acordar el alcance de firma de Electron y la secuencia de NSIS, incluidos los ejecutables interiores y el desinstalador. Firmar solo el instalador exterior no acredita esos archivos.
- Firmar el ayudante antes de generar el manifiesto de integridad y el ZIP del plugin. Los bytes no deben cambiar después de preparar ese manifiesto.
- Resolver la descarga reproducible del runtime Microsoft, cuyo enlace abreviado puede cambiar, y confirmar con SignPath su encaje como biblioteca del sistema. Se conservan los avisos de redistribución.
- Comprobar las conexiones de los componentes y resolver si corresponde incorporar un aviso y opción de desactivación en el instalador.
- Verificar las cuentas, la verificación en dos pasos y la aprobación humana de las firmas. Completar los datos y consentimientos del responsable al enviar el formulario.

Los binarios de PHP, MariaDB y demás terceros no se firmarán como si fueran código propio de SITIOO. Las configuraciones de firma deberán restringir los archivos, su nombre de producto y su versión.

## Documentación pública

- [Code signing policy](CODE-SIGNING-POLICY.md).
- [Privacidad](PRIVACIDAD.md).
- [Compilación en Windows](WINDOWS-11.md).
- [Pruebas y límites de beta.2](PRUEBAS-WINDOWS.md).
- [Licencias y avisos](../licenses/LEEME-LICENCIAS.txt).

La aceptación depende de la revisión de [SignPath Foundation](https://signpath.org/terms.html). El [formulario](https://signpath.org/apply) y la [integración con GitHub](https://docs.signpath.io/trusted-build-systems/github) se revisarán al preparar el envío. Esta publicación no crea una cuenta en SignPath, no contrata servicios y no cambia el estado de firma de las descargas actuales.
