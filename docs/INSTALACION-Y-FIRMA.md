# Instalación y publicación para Mac

Documento del flujo Mac conservado con el código compartido. Revisado para la publicación del repositorio el 15 de octubre de 2026. Para Windows, consultar [WINDOWS-11.md](WINDOWS-11.md) y [CODE-SIGNING-POLICY.md](CODE-SIGNING-POLICY.md).

## Experiencia de instalación de la beta Mac

1. Descargar el archivo DMG directamente, sin ZIP intermedio.
2. Abrirlo: aparece una ventana con iconos y dos instrucciones.
3. Arrastrar SITIOO a Aplicaciones, siguiendo la flecha.
4. Abrir SITIOO desde Aplicaciones.

Si se abre la aplicación desde el DMG, SITIOO ofrece **Instalar en Aplicaciones**, **Probar sin instalar** o **Cancelar**. La copia se inicia únicamente tras elegir instalar. Si ya existe una copia, no la sustituye automáticamente: explica cómo proceder y conserva la anterior.

La primera apertura muestra una guía de tres pasos para crear WordPress. No hay un instalador PKG adicional porque la aplicación ya incluye el motor y no necesita instalar servicios globales.

## Estado de firma

La entrega Mac 0.3.0-beta.2 generada en esta revisión no tiene firma Developer ID ni notarización. La firma ad hoc utilizada durante la preparación de componentes no equivale a una identidad verificada de distribución. Las comprobaciones de la entrega Mac 0.3 se registran en PRUEBAS-MAC-0.3.md. No equivalen a una validación en un Mac limpio ni de Gatekeeper tras descargar desde Internet.

Una cuenta Apple Developer no es por sí sola un certificado instalado. Para distribución fuera de la App Store hace falta un certificado **Developer ID Application**, su clave privada en el llavero y acceso al servicio de notarización.

## Requisitos de una futura firma Mac

El responsable deberá disponer de las herramientas y permisos de Apple necesarios y de una identidad Developer ID Application válida, con su clave privada protegida en el llavero. El perfil de notarización también debe permanecer fuera del repositorio. El trabajo actual de SignPath se refiere a Windows y no activa ni contrata servicios de Apple.

## Proceso de publicación preparado

`npm run release:mac` utiliza `CSC_NAME` para seleccionar el certificado y `SITIOO_NOTARY_PROFILE` para seleccionar un perfil del llavero. Esas variables contienen identificadores, no contraseñas. No se han creado archivos con credenciales.

El proceso preparado firma los binarios del motor y la aplicación, envía la aplicación a Apple para notarizarla, adjunta y valida el comprobante, construye el DMG y repite la validación para el DMG. Deposita el resultado en `dist-signed`, separado de las betas sin firma de distribución. Ante errores termina sin afirmar que la publicación está validada.

**Este proceso está preparado pero no ejecutado con una identidad real.** Se ha comprobado su sintaxis y el rechazo temprano si faltan los requisitos. Su validación integral sigue pendiente.

## Descarga sencilla desde la web

Para publicar esta entrega en la [página oficial](https://danimcasas.com/sitioo-wordpress-local/), primero hay que alojar y comprobar el archivo nuevo y después actualizar su enlace, versión y requisitos. La generación del DMG local no sustituye por sí sola la descarga de la web. Cualquier futura entrega firmada deberá comprobarse antes de actualizar el estado anunciado.

La beta actual es para Apple Silicon con macOS 26 o posterior. La firma no amplía por sí sola esa compatibilidad.

Fuentes oficiales:

- https://developer.apple.com/developer-id/
- https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- https://github.com/electron/electron/blob/main/docs/api/app.md
