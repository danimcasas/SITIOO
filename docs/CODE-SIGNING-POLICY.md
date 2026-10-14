# Code signing policy

SITIOO · Actualizado el 15 de octubre de 2026.

La beta Windows 0.2.0-beta.2 disponible en la [página oficial](https://danimcasas.com/sitioo-wordpress-local/) **no tiene firma digital**. Se está preparando una solicitud al programa gratuito de SignPath Foundation. Todavía no se ha enviado la solicitud ni se ha aprobado el proyecto.

## Responsabilidades

El repositorio público [danimcasas/SITIOO](https://github.com/danimcasas/SITIOO) pertenece a la cuenta [danimcasas](https://github.com/danimcasas), responsable de su mantenimiento y de revisar las contribuciones. La autoría del software se mantiene como **danimcasas.com e iNextalent.com**.

Committer y reviewer: [danimcasas](https://github.com/danimcasas). Aprobador previsto de cada firma: [danimcasas](https://github.com/danimcasas), como responsable del proyecto. La verificación en dos pasos de GitHub se comprobó el 15 de octubre de 2026. La cuenta y los permisos de SignPath se configurarán tras su aceptación, con verificación en dos pasos y aprobación humana obligatoria para cada solicitud. No se ha activado una política de firma desatendida.

## Alcance previsto

La firma se aplicará únicamente a los artefactos de SITIOO permitidos por el programa y generados desde una revisión identificada del código. Los componentes de terceros mantendrán su identidad, licencias y firmas originales. El proceso de [GitHub Actions](../.github/workflows/windows-signpath.yml) compila en Windows estándar y prepara, por este orden, el auxiliar propio, la aplicación, el desinstalador y el instalador. Su modo de ensayo es expresamente sin firma. El modo SignPath requiere la aceptación del proyecto, las credenciales privadas del servicio, el certificado aprobado y la aprobación humana de SignPath.

El código y la versión de cada archivo deben quedar vinculados al proceso de construcción. Los archivos firmados no se modificarán después. Publicar una descarga requerirá comprobar el instalador final y actualizar su documentación.

La información de privacidad se describe en [PRIVACIDAD.md](PRIVACIDAD.md), incluidas las conexiones que pueden realizar WordPress y otros componentes.

## Atribución cuando se active el servicio

Si SignPath acepta el proyecto y se activa la firma, la atribución será: “Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org)”. Este texto describe una incorporación futura; las descargas actuales continúan sin firma.

Los [requisitos pendientes](SIGNPATH.md) y las [condiciones de SignPath](https://signpath.org/terms.html) explican el trabajo necesario. Una firma válida no garantiza por sí sola que desaparezca cualquier aviso de SmartScreen; Microsoft también evalúa la reputación del archivo y del certificado. [Información de Microsoft](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).
