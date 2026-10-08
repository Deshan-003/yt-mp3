; Assisted, per-user installer. The finish page includes an optional desktop shortcut.
!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customFinishPage
  Function LaunchYT
    Exec '"$INSTDIR\YT MP3.exe"'
  FunctionEnd
  Function CreateOptionalDesktopShortcut
    CreateShortCut "$DESKTOP\YT MP3.lnk" "$INSTDIR\YT MP3.exe" "" "$INSTDIR\YT MP3.exe" 0
  FunctionEnd
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION LaunchYT
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a desktop shortcut"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION CreateOptionalDesktopShortcut
  !insertmacro MUI_PAGE_FINISH
!macroend
