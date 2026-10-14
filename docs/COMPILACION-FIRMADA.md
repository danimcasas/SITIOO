# Preparación y firma de Windows

Este proceso conserva la versión funcional 0.2.0-beta.2. Los cambios afectan a metadatos de los ejecutables, preparación de paquetes y controles de firma. El instalador publicado anteriormente continúa sin firma y no se sustituye automáticamente.

## Ensayo sin certificado

El workflow [Windows build and SignPath](../.github/workflows/windows-signpath.yml) se ejecuta manualmente en un ejecutor estándar `windows-2025` de GitHub. Seleccionar `rehearsal` construye todo sin solicitar firmas y conserva un informe pequeño. No publica una release ni cambia la landing. Este Windows de compilación no acredita pruebas de instalación en Windows 11 limpio.

En un Windows x64 local con las herramientas descritas en [WINDOWS-11.md](WINDOWS-11.md):

```powershell
$env:SITIOO_SIGNING_MODE = 'rehearsal'
$env:SITIOO_SIGNING_DIR = Join-Path $PWD ('.local\signing-' + [guid]::NewGuid().ToString('N'))
$env:ELECTRON_BUILDER_CACHE = Join-Path $PWD '.local\cache\electron-builder'
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
New-Item -ItemType Directory -Path .local -Force | Out-Null
node scripts/signpath/initialize.cjs
pwsh -NoProfile -File scripts/fetch-windows.ps1
pwsh -NoProfile -File scripts/build-native.ps1
node scripts/signpath/stage-native.cjs
node -e "require('app-builder-lib/out/toolsets/7zip').getPath7za().then(p=>console.log(p))"
pwsh -NoProfile -File scripts/prepare-windows.ps1
pwsh -NoProfile -File scripts/prepare-crt.ps1
node scripts/prepare-migration.cjs
npm test
node scripts/signpath/build.cjs
node scripts/signpath/check-bundle.cjs
```

Detenerse si cualquier comando falla. Usar siempre una carpeta nueva. Los ejecutables de ensayo no acreditan una firma y no deben reemplazar las descargas publicadas.

## Activación tras la aceptación de SignPath

1. El responsable completa el alta gratuita y la verificación en dos pasos en SignPath. No se debe contratar un plan de pago ni aportar un certificado comprado.
2. En SignPath se vincula el proyecto con el sistema de compilación de confianza GitHub.com y el repositorio `danimcasas/SITIOO`. Se exige origen `main`, workflow manual de este repositorio, ejecutores de GitHub y aprobación humana de cada solicitud. La propuesta de [política de compilación](../config/signpath/pipeline-policy.yml) debe importarse y revisarse en el servicio; guardarla en GitHub no la activa.
3. Se crean las cuatro configuraciones `native`, `application`, `uninstaller` e `installer` con sus [XML](../config/signpath/native.xml). Todas restringen el nombre y versión del producto. El responsable confirma con SignPath el tratamiento del ejecutable de Electron y de las bibliotecas Microsoft del sistema antes de firmar.
4. Se crea una política `release-signing` que requiera aprobación humana. La identidad de envío solo necesita permiso para solicitar firmas, sin aprobación automática ni administración de certificados.
5. En GitHub se introducen las variables `SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG`, `SIGNPATH_SIGNING_POLICY_SLUG=release-signing` y `SIGNPATH_CERTIFICATE_SHA256`. Esta última identifica los bytes del certificado público aprobado; no es el hash del instalador. El token de envío se guarda exclusivamente como secreto de Actions `SIGNPATH_API_TOKEN`, nunca en un archivo o mensaje.
6. Se ejecuta el workflow desde `main` con modo `signpath`. El servicio solicita la aprobación del responsable en las cuatro etapas. Si falta un dato, no llega una firma a tiempo o falla su validación, el proceso se detiene.

La conexión y los certificados reales solo se pueden verificar después del alta y aceptación del proyecto. No se han inventado identificadores ni configurado claves provisionales.

## Orden y comprobaciones

- El auxiliar se compila desde C++ con metadatos SITIOO y versión coherente. Después de firmarlo se copia al motor y al plugin; a continuación se generan el ZIP y el manifiesto de integridad del plugin.
- Electron Builder prepara el ejecutable de la aplicación. Su función de firma acepta una ruta exacta de SITIOO, prepara el archivo y espera al resultado de la acción oficial de SignPath.
- El mismo empaquetador prepara y firma el desinstalador antes de incorporarlo al instalador. No se recompila un segundo desinstalador que pueda diferir del firmado.
- El instalador se firma al final. Los bytes ejecutables deben coincidir con los enviados, excluyendo únicamente los campos y datos propios de Authenticode. Se comprueban la firma de Windows, el sello de tiempo y la huella del certificado aprobado.
- PHP, MariaDB y las DLL del motor conservan sus bytes. La comprobación final rechaza cambios en esos componentes. La selección de archivos enviados a SignPath excluye los binarios de terceros.
- La comprobación final valida también el manifiesto del plugin y que ambas copias del auxiliar sean idénticas. El ZIP se crea después de firmar; cambiar el auxiliar obliga a repetir la preparación.

## Coste y conservación

Se usan únicamente ejecutores estándar de un repositorio público, sin cachés de Actions. El ensayo sube solo un informe pequeño. Los cuatro paquetes enviados para firmar caducan al día; no se suben copias adicionales de los ejecutables firmados. El instalador final puede recuperarse desde la solicitud de SignPath. Antes de activar firmas reales hay que comprobar la cuota de almacenamiento de Actions y mantener el gasto autorizado en cero: el almacenamiento y los ejecutores grandes pueden tener coste aunque la compilación estándar del repositorio público sea gratuita. [Condiciones de GitHub](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

Una firma válida no sustituye la instalación y apertura reales, las pruebas del motor, la actualización y la desinstalación. Antes de publicar la primera descarga firmada deben ejecutarse esas pruebas sobre ese archivo y generar las sumas definitivas. No hay publicación automática.

## Fuentes técnicas

- [SignPath y GitHub](https://docs.signpath.io/trusted-build-systems/github).
- [Acción oficial de SignPath](https://github.com/SignPath/github-action-submit-signing-request).
- [Restricciones de archivos](https://docs.signpath.io/artifact-configuration/reference).
- [Condiciones del programa gratuito](https://signpath.org/terms).

Las acciones están fijadas por revisión completa. Electron Builder y las dependencias npm quedan fijados por `package-lock.json`; los componentes del motor por `windows-dependencies.lock.json`. La URL de Microsoft apunta a la descarga concreta verificada, conservando el hash de la beta original.
