@echo off
setlocal

set "TARGET_DIR=%LOCALAPPDATA%\PracticePlanner"

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"
copy /Y "%~dp0open-folder.vbs" "%TARGET_DIR%\open-folder.vbs" >nul

reg add "HKCU\Software\Classes\ouvrir" /ve /d "URL:Ouvrir Protocol" /f >nul
reg add "HKCU\Software\Classes\ouvrir" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\ouvrir\shell\open\command" /ve /d "wscript.exe \"%TARGET_DIR%\open-folder.vbs\" \"%%1\"" /f >nul

echo.
echo ============================================
echo  Protocole "ouvrir://" installe avec succes.
echo  Tu peux desormais fermer cette fenetre et
echo  cliquer sur les liens "Ouvrir" dans l'app.
echo ============================================
echo.
pause
