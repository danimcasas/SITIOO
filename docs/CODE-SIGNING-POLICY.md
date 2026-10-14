# Code signing policy

SITIOO · Actualizado el 15 de octubre de 2026.

La beta Windows 0.2.0-beta.2 disponible en la [página oficial](https://danimcasas.com/sitioo-wordpress-local/) **no tiene firma digital**. Se está preparando una solicitud al programa gratuito de SignPath Foundation. Todavía no se ha enviado la solicitud ni se ha aprobado el proyecto.

## Responsabilidades

El repositorio público [danimcasas/SITIOO](https://github.com/danimcasas/SITIOO) pertenece a la cuenta [danimcasas](https://github.com/danimcasas), responsable de su mantenimiento y de revisar las contribuciones. La autoría del software se mantiene como **danimcasas.com e iNextalent.com**.

La aprobación de solicitudes de firma aún no está configurada. Antes de activarla se asignarán sus responsables, se verificará la protección de las cuentas con verificación en dos pasos y se documentará el procedimiento de aprobación humana de cada versión.

## Alcance previsto

La firma se aplicará únicamente a los artefactos de SITIOO permitidos por el programa y generados desde una revisión identificada del código. Los componentes de terceros mantendrán su identidad, licencias y firmas originales. La compilación automática verificable y su integración con SignPath están pendientes.

El código y la versión de cada archivo deben quedar vinculados al proceso de construcción. Los archivos firmados no se modificarán después. Publicar una descarga requerirá comprobar el instalador final y actualizar su documentación.

La información de privacidad se describe en [PRIVACIDAD.md](PRIVACIDAD.md), incluidas las conexiones que pueden realizar WordPress y otros componentes.

## Atribución cuando se active el servicio

Si SignPath acepta el proyecto y se activa la firma, se añadirá la atribución exigida por el programa: “Free code signing provided by SignPath.io, certificate by SignPath Foundation”. Este texto describe una incorporación futura; las descargas actuales continúan sin firma.

Los [requisitos pendientes](SIGNPATH.md) y las [condiciones de SignPath](https://signpath.org/terms.html) explican el trabajo necesario. Una firma válida no garantiza por sí sola que desaparezca cualquier aviso de SmartScreen; Microsoft también evalúa la reputación del archivo y del certificado. [Información de Microsoft](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).
