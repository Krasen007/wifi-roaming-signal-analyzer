@echo off
REM ===========================================================================
REM  FloorScope - single point of start.
REM
REM  Starts everything the live analyzer needs:
REM    1. the PowerShell scan loop that rewrites scan.txt and wired.txt every
REM       5 seconds
REM    2. the production preview server (npm run start). The bundle is rebuilt
REM       only when source files are newer than dist\, so repeat launches are fast
REM    3. the app itself, already in live mode (?live=scan.txt&wired=wired.txt)
REM
REM  Double-click this file. Close the two long-running windows (scan loop and
REM  server) to stop everything; the LLDP capture window closes on its own.
REM ===========================================================================
setlocal EnableExtensions
title FloorScope launcher
cd /d "%~dp0"

set "SCANFILE=scan.txt"
set "WIREDFILE=wired.txt"
REM Port file published by the Vite server (see the plugin in vite.config.ts).
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
REM LLDP capture runs separately (up to 40 s) so the first scan is not delayed.
start "FloorScope LLDP capture - closes when done" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\lldp-capture.ps1" -OutFile "%~dp0lldp.txt"
start "FloorScope scan loop - close this window to stop" powershell -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; while ($true) { $(netsh wlan show networks mode=bssid; netsh wlan show interfaces) | Out-File -LiteralPath '%~dp0%SCANFILE%' -Encoding utf8; & '%~dp0scripts\wired-snapshot.ps1' -OutFile '%~dp0%WIREDFILE%' -LldpFile '%~dp0lldp.txt'; Start-Sleep 5 }"

REM --- 3) Production server (build only when needed, then vite preview) -----
echo [3/3] Starting the production preview server in its own window ...
REM Drop any port file left behind by an earlier run, so the wait loop below can
REM only ever read the port of the server we are starting right now.
if exist "%PORTFILE%" del "%PORTFILE%" >nul 2>&1
start "FloorScope server - close this window to stop" cmd /k npm run start

REM --- Wait for the server, then open the app in live mode ------------------
REM The Vite plugin publishes the port it actually bound to into %PORTFILE%
REM (and removes the file again when the server stops), so no port guessing.
echo.
echo Waiting for the production server (the first build can take a few seconds) ...
set "PORT="
for /L %%I in (1,1,40) do (
  if not defined PORT call :read_port
)
if not defined PORT goto :server_timeout

REM --- Open the app already watching the scan + wired files ----------------
start "" "http://localhost:%PORT%/?live=%SCANFILE%&wired=%WIREDFILE%"

echo.
echo ==========================================================
echo   FloorScope is LIVE
echo ==========================================================
echo   App        : http://localhost:%PORT%/?live=%SCANFILE%^&wired=%WIREDFILE%
echo   Scan file  : %CD%\%SCANFILE%
echo   Wired file : %CD%\%WIREDFILE%
echo   Scan loop  : "FloorScope scan loop" window - Ctrl+C or close it to stop
echo   Server     : "FloorScope server" window    - close it to stop
echo ==========================================================
echo   The URL carries ?live=%SCANFILE%^&wired=%WIREDFILE%, so the app
echo   starts watching both files by itself - no file picker needed. Keep
echo   both windows open while you walk around; a new scan shows up every
echo   ~5 seconds.
echo ==========================================================
echo.
exit /b 0

:server_timeout
echo.
echo [!] The production server did not publish its port within 40 seconds.
echo     Check the "FloorScope server" window for errors, then open:
echo         http://localhost:4173/?live=%SCANFILE%^&wired=%WIREDFILE%
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
REM Called in the wait loop until the server has published its port.
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
