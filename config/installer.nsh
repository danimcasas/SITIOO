; SITIOO GPL-2.0-or-later. Per-user installer; site data lives outside INSTDIR.
!macro customInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "SITIOO necesita Windows 11 x64."
    Abort
  ${EndIf}
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentBuildNumber"
  ${If} $0 < 22000
    MessageBox MB_ICONSTOP "Esta beta necesita Windows 11 x64."
    Abort
  ${EndIf}
!macroend

; WordPress contiene rutas largas. NSIS debe usar la sintaxis extendida
; durante la retirada de archivos, sin cambiar LongPathsEnabled en Windows.
; Se conserva la retirada atómica y la restauración del instalador base.
!ifdef BUILD_UNINSTALLER
  Var /GLOBAL sitiooOriginalInstallDir
!endif
!macro customRemoveFiles
  StrCpy $sitiooOriginalInstallDir "$INSTDIR"
  StrCpy $0 $INSTDIR 4
  ${If} $0 != "\\?\"
    StrCpy $INSTDIR "\\?\$INSTDIR"
  ${EndIf}
  ${If} ${isUpdated}
    CreateDirectory "$PLUGINSDIR\old-install"
    Push ""
    Call un.atomicRMDir
    Pop $R0
    ${If} $R0 != 0
      DetailPrint "No se pudo retirar un archivo de SITIOO: $R0"
      Push ""
      Call un.restoreFiles
      Pop $R0
      StrCpy $INSTDIR "$sitiooOriginalInstallDir"
      Abort "Cierra SITIOO y vuelve a intentar la actualización. Se conserva la instalación anterior."
    ${EndIf}
  ${EndIf}
  SetOutPath $TEMP
  RMDir /r $INSTDIR
  StrCpy $INSTDIR "$sitiooOriginalInstallDir"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Instalar SITIOO"
  !define MUI_WELCOMEPAGE_TEXT "SITIOO incluye WordPress, PHP y MariaDB.$\r$\n$\r$\nSe instala para tu cuenta de Windows. Tus proyectos se guardan aparte y se conservan al actualizar o desinstalar.$\r$\n$\r$\nAutoría: danimcasas.com e iNextalent.com.$\r$\nGPL v2 o posterior. Beta sin firma digital."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Desinstalar SITIOO"
  !define MUI_WELCOMEPAGE_TEXT "Se retirará la aplicación.$\r$\n$\r$\nTus proyectos, copias y accesos cifrados se conservarán en la carpeta de datos de tu cuenta.$\r$\n$\r$\nPuedes volver a instalar SITIOO con la misma cuenta de Windows para recuperarlos."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend
