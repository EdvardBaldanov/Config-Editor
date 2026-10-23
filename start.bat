@echo off
setlocal
cd /d "%~dp0"

set "EXE=config-studio-windows-amd64.exe"
if not exist "%EXE%" set "EXE=config-studio.exe"
if not exist "%EXE%" set "EXE=config-editor-windows-amd64.exe"
if not exist "%EXE%" set "EXE=config-editor.exe"
if not exist "%EXE%" (
    echo [ERROR] Config Studio executable not found in %~dp0
    echo Please make sure config-studio-windows-amd64.exe is in this folder.
    echo.
    pause
    exit /b 1
)

set "PORT=8080"
set "WORKDIR=%~dp0."
set "DATADIR=%~dp0data"

echo ========================================================
echo  Config Studio
echo ========================================================
echo  Executable: %EXE%
echo  Working Dir: %WORKDIR%
echo  Data Dir:    %DATADIR%
echo  URL:         http://localhost:%PORT%
echo ========================================================
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:%PORT%"
"%EXE%" -workdir "%WORKDIR%" -data "%DATADIR%" -port %PORT%

if errorlevel 1 pause