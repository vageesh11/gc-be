@echo off
:: ============================================================
:: Gaming Cafe -- Stop both servers
:: ============================================================

setlocal

set BE_DIR=C:\Users\Pramod\gc-be

set BE_PORT=3000
for /f "tokens=2 delims==" %%A in ('findstr /i "^PORT=" "%BE_DIR%\.env" 2^>nul') do set BE_PORT=%%A

echo Stopping Gaming Cafe servers...

:: Kill backend (port from .env)
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%BE_PORT%.*LISTENING"') do (
    echo   Stopping backend (PID %%A)...
    taskkill /PID %%A /F >nul 2>&1
)

:: Kill frontend (port 4173)
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":4173.*LISTENING"') do (
    echo   Stopping frontend (PID %%A)...
    taskkill /PID %%A /F >nul 2>&1
)

echo Done. Both servers stopped.
timeout /t 2 /nobreak >nul
endlocal
