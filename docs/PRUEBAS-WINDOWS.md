# Pruebas de SITIOO 0.2.0-beta.2 para Windows

Informe público basado en los registros de la entrega del 14 de octubre de 2026. Publicado con el código el 15 de octubre. Las pruebas funcionales siguientes no se han repetido por el hecho de publicar el repositorio.

Entorno: un PC Windows 11 x64. Todos los sitios y contenidos de las pruebas son ficticios. Resultado de la matriz de entrega: **13 pruebas superadas y 1 pendiente**.

| Prueba | Resultado |
| --- | --- |
| Instalación del ejecutable y apertura de la aplicación | superada |
| Creación de dos sitios independientes | superada |
| Inicio de sesión en wp-admin de ambos sitios | superada |
| Conservación de datos y accesos al reiniciar la aplicación | superada |
| Inicio y parada sin procesos huérfanos | superada |
| Ausencia de interferencias con procesos ajenos | superada |
| Plugin instalado y activado en nuevos sitios | superada |
| Instalación y actualización del plugin en sitio existente | superada |
| Copia, exportación e importación de datos ficticios | superada |
| Recuperación de una migración interrumpida | superada |
| Compatibilidad de paquetes con Mac | pendiente |
| Rutas con espacios, acentos y archivos profundos | superada |
| Actualización conservando sitios y accesos | superada |
| Desinstalación conservando sitios por defecto | superada |

## Límites

Pendientes un Windows limpio, el reinicio de Windows y el intercambio con un Mac físico. Reiniciar la aplicación no equivale a reiniciar el sistema operativo. La compatibilidad de formato comprobada en Windows no acredita por sí sola una prueba física en Mac.

El instalador y el ayudante siguen sin firma digital. Las pruebas no cubren todas las versiones de hosting, temas, plugins ni los límites máximos del formato. No se ha ejecutado una auditoría completa de seguridad de todas las dependencias.

## Evidencia y repetición

El [paquete de documentación de la página oficial](https://danimcasas.com/sitioo-wordpress-local/#descargar) contiene la matriz con pasos, resultados esperados, observaciones y referencias a evidencias. Los sitios, las bases de datos de prueba, las credenciales y los registros internos quedan fuera del repositorio.

[WINDOWS-11.md](WINDOWS-11.md) describe cómo preparar las herramientas y ejecutar las pruebas. El código de esas pruebas está en `tests/` y `scripts/`. La instalación, actualización y desinstalación requieren comprobar el ejecutable final; una compilación correcta no sustituye ese recorrido.

## Comprobación de la copia pública · 15 de octubre de 2026

Se ha ejecutado `node --test tests/*.test.cjs` en una copia nueva del código, en Windows 11 x64, usando el ayudante incluido en el plugin. Resultado: **23 pruebas superadas, 0 fallidas y 4 omitidas**. Las omitidas comprueban la instalación en Mac y no corresponden a esta plataforma.

La ejecución incluye las comprobaciones reales de cifrado DPAPI y control del árbol de procesos en Windows, además de lógica de proyectos, accesos, copias e interfaz de migración. Utiliza datos ficticios. Esta comprobación no repite el recorrido funcional completo de instalación, sitios y migraciones del informe anterior.
