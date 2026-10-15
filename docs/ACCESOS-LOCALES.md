# Accesos locales — SITIOO 0.3.0-beta.1

La guía de uso está en `manual-app.html`, apartado «Conservar y recuperar los accesos».

AccessVault guarda usuario y contraseña opcionales en un único archivo cifrado por proyecto. Emplea safeStorage asíncrono de Electron en Windows y macOS. Verifica la disponibilidad antes de guardar. Un fallo de cifrado o descifrado se muestra al usuario, sin alternativa en texto plano. El contenido incorpora el identificador del proyecto para rechazar intercambios de archivos.

En Windows se comprueban ACL privadas con el ayudante nativo. Las claves independientes del motor utilizan DPAPI CurrentUser; son distintas del acceso administrativo que decide recordar el usuario. Se inyectan a procesos propios y no se escriben en wp-config.php ni en argumentos.

La interfaz muestra la contraseña como máximo 30 segundos y la oculta al perder el foco. Copiarla utiliza el portapapeles del usuario. No comprueba ni modifica automáticamente la contraseña de WordPress. Quitar el acceso guardado requiere confirmación y conserva la cuenta de WordPress.

La conservación del archivo cifrado no permite prometer descifrado en otro ordenador o cuenta. Conservar la carpeta completa, la cuenta y las claves del sistema. Para migrar contenido entre sistemas, exportar e importar con un administrador propio en el destino. No se incluyen estos archivos cifrados en los paquetes de migración ni en la entrega de código.
