# Versiones de SITIOO

## 0.3.0-beta.1 — 2026-10-15

- Duplicar un proyecto: guarda una copia numerada del estado actual y crea un sitio independiente.
- Recuperar una copia del historial como un proyecto nuevo, conservando las versiones y el sitio original.
- Importar una exportación desde SITIOO seleccionando su índice junto a todos los paquetes ZIP.
- Comprobación de tamaño e integridad antes de crear el destino; validación del contenido con el importador compartido de formato 1.
- Administrador nuevo elegido por el usuario y acceso opcional cifrado. El destino queda detenido; SITIOO Migration activo y los otros plugins inactivos para revisión.
- Los intentos incompletos conservan los archivos para diagnóstico y no sustituyen proyectos existentes.
- Dirección local de WordPress fijada explícitamente tras la instalación para evitar que el cálculo de URL de la consola incorpore una ruta larga de Windows.
- Manuales, pruebas automatizadas y pruebas reales de las nuevas operaciones en Windows. No añade dependencias. Instalador sin firma digital.
- Desarrollo y entrega locales; publicación de esta versión pendiente de autorización.

## Preparación de firma gratuita — 2026-10-15

- Proceso manual de Windows y SignPath con configuraciones separadas para auxiliar, aplicación, desinstalador e instalador. La activación real depende de la aceptación de SignPath.
- Metadatos de producto y versión en el auxiliar Windows; reconstrucción independiente del auxiliar del plugin.
- Rechazo de firmas ausentes, certificados inesperados y cambios en el contenido ejecutable. Componentes de terceros excluidos de la firma propia.
- URL concreta y hash fijado del runtime Microsoft. Compatibilidad reconocida con el plugin beta.2 original al incorporar el auxiliar preparado para firma.
- La beta descargable original se conserva. Estos cambios no anuncian una versión firmada ni una aceptación del programa.

## Publicación del código — 2026-10-15

- Primera copia pública revisada de la beta 0.2.0-beta.2, con sus fuentes, pruebas, manuales y licencias.
- Documentación actualizada con la página de descarga, resultados de Windows y estado de preparación para SignPath.
- Información de privacidad y política de firma publicadas; solicitud a SignPath y firma digital pendientes.
- El comportamiento de la aplicación, el formato de migración y el instalador ya distribuido no cambian en esta publicación del código.

## 0.2.0-beta.2 — 2026-10-14

- Motor nativo Windows 11 x64 separado del adaptador Mac; PHP/MariaDB incluidos, base por proyecto y escucha local.
- Supervisor Windows con Job Objects y cierre ordenado de MariaDB; claves del motor cifradas con DPAPI y accesos con safeStorage, sin texto plano alternativo.
- Rutas con espacios y acentos; configuración de enlaces de WordPress sin subprocesos de WP-CLI que alteren la codificación de rutas.
- SITIOO Migration incluido y activo al crear WordPress. Gestión confirmada en sitios existentes, copia anterior y bloqueo de versiones desconocidas o modificadas.
- Exportación con separadores portables, permisos privados Windows y rechazo de nombres incompatibles; formato 1 conservado.
- Instalador NSIS por usuario con icono SITIOO; actualización/desinstalación conservan datos. Sin firma digital.
- Manuales de aplicación y plugin, glosario, preguntas frecuentes, fuentes y avisos de redistribución.
- Pruebas Windows registradas por separado. No se atribuyen pruebas a Windows limpio, reinicio de Windows ni ejecución física en Mac sin evidencia.

## 0.2.0-beta.1 — 2026-10-13

- Copias completas por proyecto con numeración creciente, fecha y nota.
- Exportación de manifiesto, ZIP fragmentados y plugin instalable de WordPress.
- SITIOO Migration: subida en fragmentos, comprobación de integridad, importación por etapas, cambio de dominio y recuperación de originales.
- Conservación del administrador del hosting y adaptación del prefijo de tablas.
- Créditos: creado por danimcasas.com e iNextalent.com. Código original bajo GPL v2 o posterior.
- Los plugins importados se entregan inactivos para revisión. Compatibilidad inicial con WordPress individual; ver los límites documentados.

## 0.1.0-beta.4

Accesos locales opcionales cifrados con protección del llavero de macOS.

## 0.1.0-beta.3

Corrección de la ruta al administrador de WordPress y pruebas de autenticación reforzadas.

## 0.1.0-beta.2

Icono propio, DMG con instrucciones y guía de instalación.

## 0.1.0-beta.1

Primera beta para macOS Apple Silicon con WordPress local, PHP y MariaDB incluidos.

## Criterio de numeración

La aplicación y el plugin comparten versión: mayor.menor.corrección-beta.número. Una funcionalidad nueva incrementa la versión menor; una corrección estable incrementa la última cifra. Las iteraciones de prueba incrementan beta. El formato de paquetes lleva un número independiente (actualmente 1), para poder rechazar formatos incompatibles.

Las copias de cada proyecto llevan su propia secuencia: 1, 2, 3… Un intento fallido reserva su número y no sustituye ninguna copia anterior. Son instantáneas completas; todavía no hay copias incrementales ni comparación visual entre versiones.

