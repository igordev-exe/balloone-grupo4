@echo off
chcp 65001 >nul
title Balloone G4 - Interface
cd /d "%~dp0"
echo.
echo  === Balloone G4 - Estacao de controle ===
echo.

rem Se a interface ja estiver rodando, so abre a janela
curl -s -o nul http://localhost:5173/ >nul 2>nul && goto janela

rem 1. Node.js (instala pelo winget se faltar)
set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js nao encontrado. Instalando pelo winget...
  echo  Se o Windows pedir permissao, clique em Sim.
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
)
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Nao consegui instalar o Node.js sozinho.
  echo  Instale o Node.js LTS em https://nodejs.org e abra este arquivo de novo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo  Node.js %%v encontrado.

rem 2. Dependencias (so na primeira vez)
if not exist node_modules (
  echo.
  echo  Instalando as dependencias. Na primeira vez leva 1 ou 2 minutos...
  call npx --yes pnpm@10.28.0 install
  if errorlevel 1 (
    echo  A instalacao falhou. Tire um print desta janela.
    pause
    exit /b 1
  )
)

rem 3. Sobe o servidor numa janela minimizada
echo.
echo  Ligando a interface...
start "Balloone G4 - servidor (feche para desligar)" /min cmd /k "npx --yes pnpm@10.28.0 dev --port 5173 --strictPort"

set /a ESPERA=0
:espera
curl -s -o nul http://localhost:5173/ >nul 2>nul && goto janela
timeout /t 1 /nobreak >nul
set /a ESPERA+=1
if %ESPERA% LSS 60 goto espera

:janela
rem 4. Abre a interface numa janela propria, em tela cheia (Edge; se nao tiver, Chrome)
set "URL=http://localhost:5173"
set "PERFIL=%LOCALAPPDATA%\BallooneG4\janela"
set "NAV=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%NAV%" set "NAV=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%NAV%" set "NAV=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%NAV%" set "NAV=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if exist "%NAV%" goto abrir_app
start "" "%URL%"
goto atalho

:abrir_app
start "" "%NAV%" --app=%URL% --start-fullscreen --user-data-dir="%PERFIL%" --no-first-run --no-default-browser-check

:atalho
rem 5. Atalho na Area de Trabalho (so cria uma vez)
if exist "%LOCALAPPDATA%\BallooneG4\atalho-criado" goto fim
if not exist "%LOCALAPPDATA%\BallooneG4" mkdir "%LOCALAPPDATA%\BallooneG4"
powershell -NoProfile -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut($d+'\Balloone G4.lnk'); $s.TargetPath='%~dp0INICIAR.bat'; $s.WorkingDirectory='%~dp0'; $s.IconLocation='%~dp0tools\balloone.ico'; $s.WindowStyle=7; $s.Save()" >nul 2>nul && echo ok> "%LOCALAPPDATA%\BallooneG4\atalho-criado" && echo  Atalho "Balloone G4" criado na Area de Trabalho.

:fim
echo.
echo  Pronto. A interface abriu em tela cheia (F11 sai da tela cheia, Alt+F4 fecha).
echo  Para desligar de vez, feche a janela "Balloone G4 - servidor" na barra de tarefas.
timeout /t 6 >nul
exit /b 0
