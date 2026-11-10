@echo off
REM ===========================================================================
REM  FloorScope - wired-only local launcher.
REM
REM  Starts:
REM    1. a one-shot LLDP capture and the wired snapshot loop
REM    2. the production preview server (npm run start). The bundle is rebuilt
REM       only when source files are newer than dist\, so repeat launches are fast
REM    3. the app itself, already in wired live mode (?wired=wired.txt)
REM
REM  Double-click this file. Close the two long-running windows (scan loop and
REM  server) to stop everything; the LLDP capture window closes on its own.
REM ===========================================================================
setlocal EnableExtensions
title FloorScope wired launcher
cd /d "%~dp0"

set "WIREDFILE=wired.txt"
set "PORTFILE=.floorscope-port"

echo ==========================================================
echo   FloorScope - wired LAN scanner
echo ==========================================================
echo.

REM --- 1) Dependencies ------------------------------------------------------
if exist "node_modules" (
  echo [1/3] Dependencies already installed.
) else (
  echo [1/3] node_modules missing - running npm install ...
  call npm install
  if errorlevel 1 goto :install_failed
)

REM --- 2) Wired loop (writes wired.txt next to this file) ------------------
echo [2/3] Starting the wired scan loop in its own PowerShell window ...
start "FloorScope LLDP capture - closes when done" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\lldp-capture.ps1" -OutFile "%~dp0lldp.txt"
start "FloorScope wired scan loop - close this window to stop" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; while ($true) { & '%~dp0scripts\wired-snapshot.ps1' -OutFile '%~dp0%WIREDFILE%' -LldpFile '%~dp0lldp.txt'; Start-Sleep 5 }"

REM --- 3) Production server (build only when needed, then vite preview) -----
echo [3/3] Starting the production preview server in its own window ...
if exist "%PORTFILE%" del "%PORTFILE%" >nul 2>&1
start "FloorScope server - close this window to stop" cmd /k npm run start

REM --- Wait for the server, then open the app in wired live mode ------------
echo.
echo Waiting for the production server (the first build can take a few seconds) ...
set "PORT="
for /L %%I in (1,1,40) do (
  if not defined PORT call :read_port
)
if not defined PORT goto :server_timeout

start "" "http://localhost:%PORT%/?wired=%WIREDFILE%"

echo.
echo ==========================================================
echo   FloorScope wired scanner is LIVE
echo ==========================================================
echo   App        : http://localhost:%PORT%/?wired=%WIREDFILE%
echo   Wired file : %CD%\%WIREDFILE%
echo   Scan loop  : "FloorScope wired scan loop" window - Ctrl+C or close it to stop
echo   Server     : "FloorScope server" window - close it to stop
echo ==========================================================
echo   The URL carries ?wired=%WIREDFILE%, so the app starts watching the
echo   wired file by itself - no file picker needed. Keep both windows open
echo   while testing; a new snapshot shows up every ~5 seconds.
echo ==========================================================
echo.
exit /b 0

:server_timeout
echo.
echo [!] The production server did not publish its port within 40 seconds.
echo     Check the "FloorScope server" window for errors, then open:
echo         http://localhost:4173/?wired=%WIREDFILE%
echo.
pause
exit /b 1

:install_failed
echo.
echo [!] npm install failed. Fix the errors above, then run this file again.
echo.
pause
exit /b 1

REM --- Helpers -------------------------------------------------------------
:read_port
if not exist "%PORTFILE%" goto :read_port_wait
set "PORT="
set /p PORT=<"%PORTFILE%"
if not defined PORT goto :read_port_wait
exit /b 0

:read_port_wait
timeout /t 1 /nobreak >nul 2>&1 || ping -n 2 127.0.0.1 >nul 2>&1
exit /b 0
