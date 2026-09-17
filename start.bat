@echo off
REM ===========================================================================
REM  FloorScope - single point of start.
REM
REM  Starts everything the live analyzer needs:
REM    1. the PowerShell scan loop that rewrites scan.txt every 5 seconds
REM    2. the Vite dev server (npm run dev)
REM    3. the app itself, already in live mode (?live=scan.txt)
REM
REM  Double-click this file. Close the two spawned windows to stop everything.
REM ===========================================================================
setlocal EnableExtensions
title FloorScope launcher
cd /d "%~dp0"

set "SCANFILE=scan.txt"
REM Port file published by the Vite dev server (see the plugin in vite.config.ts).
set "PORTFILE=.floorscope-port"

echo ==========================================================
echo   FloorScope - live WiFi floor-roaming analyzer
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

REM --- 2) Scan loop (writes scan.txt next to this file) ---------------------
echo [2/3] Starting the scan loop in its own PowerShell window ...
start "FloorScope scan loop - close this window to stop" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; while ($true) { $(netsh wlan show networks mode=bssid; netsh wlan show interfaces) | Out-File -LiteralPath '%~dp0%SCANFILE%' -Encoding utf8; Start-Sleep 5 }"

REM --- 3) Dev server -------------------------------------------------------
echo [3/3] Starting the Vite dev server in its own window ...
REM Drop any port file left behind by an earlier run, so the wait loop below can
REM only ever read the port of the server we are starting right now.
if exist "%PORTFILE%" del "%PORTFILE%" >nul 2>&1
start "FloorScope dev server - close this window to stop" cmd /k npm run dev

REM --- Wait for the dev server, then open the app in live mode --------------
REM The Vite plugin publishes the port it actually bound to into %PORTFILE%
REM (and removes the file again when the server stops), so no port guessing.
echo.
echo Waiting for the dev server (the first build can take a few seconds) ...
set "PORT="
for /L %%I in (1,1,40) do (
  if not defined PORT call :read_port
)
if not defined PORT goto :server_timeout

REM --- Open the app already watching the scan file -------------------------
start "" "http://localhost:%PORT%/?live=%SCANFILE%"

echo.
echo ==========================================================
echo   FloorScope is LIVE
echo ==========================================================
echo   App        : http://localhost:%PORT%/?live=%SCANFILE%
echo   Scan file  : %CD%\%SCANFILE%
echo   Scan loop  : "FloorScope scan loop" window  - Ctrl+C or close it to stop
echo   Dev server : "FloorScope dev server" window - close it to stop
echo ==========================================================
echo   The URL carries ?live=%SCANFILE%, so the app starts watching the
echo   file by itself - no file picker needed. Keep both windows open
echo   while you walk around; a new scan shows up every ~5 seconds.
echo ==========================================================
echo.
pause
exit /b 0

:server_timeout
echo.
echo [!] The dev server did not publish its port within 40 seconds.
echo     Check the "FloorScope dev server" window for errors, then open:
echo         http://localhost:5173/?live=%SCANFILE%
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
REM Called in the wait loop until the dev server has published its port.
:read_port
if not exist "%PORTFILE%" goto :read_port_wait
set "PORT="
set /p PORT=<"%PORTFILE%"
if not defined PORT goto :read_port_wait
exit /b 0

:read_port_wait
REM ~1 s pause. `timeout` needs a console, so fall back to ping when redirected.
timeout /t 1 /nobreak >nul 2>&1 || ping -n 2 127.0.0.1 >nul 2>&1
exit /b 0
