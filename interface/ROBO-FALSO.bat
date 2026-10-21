@echo off
chcp 65001 >nul
title Balloone G4 - Robo falso
cd /d "%~dp0"
echo.
echo  === Robo falso (imita a ESP32) ===
echo.
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
  where python >nul 2>nul && set "PY=python"
)
if not defined PY (
  echo  Python nao encontrado. Instalando pelo winget...
  winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
  echo.
  echo  Feche esta janela e abra o ROBO-FALSO de novo.
  pause
  exit /b 0
)
%PY% -c "import websockets, PIL" >nul 2>nul
if errorlevel 1 (
  echo  Instalando websockets e pillow...
  %PY% -m pip install --user websockets pillow
)
echo.
echo  Na interface: Robo real, endereco 127.0.0.1,
echo  e em Ajustes: porta do WebSocket 8080 e porta do video 8081.
echo.
%PY% tools\robo_falso.py
pause
