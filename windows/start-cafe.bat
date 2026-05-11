@echo off
:: ============================================================
:: Gaming Cafe -- Silent Background Startup
:: This is called by Task Scheduler on login.
:: No terminal windows appear. Both servers run in background.
:: ============================================================

setlocal

:: ── Paths (change these if your folders are in a different drive) ──
set BE_DIR=C:\gc-be
set FE_DIR=C:\gc-fe
set LOG_DIR=C:\gc-be\logs

:: ── Create logs directory if it doesn't exist ──────────────
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: ── Read PORT from .env (default 3000) ─────────────────────
set BE_PORT=3000
for /f "tokens=2 delims==" %%A in ('findstr /i "^PORT=" "%BE_DIR%\.env" 2^>nul') do set BE_PORT=%%A

:: ── Kill any existing node processes on these ports ────────
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%BE_PORT%.*LISTENING"') do (
    taskkill /PID %%A /F >nul 2>&1
)
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":4173.*LISTENING"') do (
    taskkill /PID %%A /F >nul 2>&1
)

:: ── Short wait after killing old processes ──────────────────
timeout /t 2 /nobreak >nul

:: ── Start Backend silently (output goes to log file) ───────
start "" /B cmd /c "cd /d "%BE_DIR%" && node src\server.js >> "%LOG_DIR%\backend.log" 2>&1"

:: ── Wait for backend to be ready ────────────────────────────
timeout /t 4 /nobreak >nul

:: ── Start Frontend (serves compiled dist, no source exposed) 
start "" /B cmd /c "cd /d "%FE_DIR%" && npx vite preview --host 0.0.0.0 >> "%LOG_DIR%\frontend.log" 2>&1"

endlocal
exit
