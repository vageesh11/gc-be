@echo off
:: ============================================================
:: Gaming Cafe -- Silent Background Startup
:: Called by Task Scheduler on login.
:: ============================================================

:: ── Paths (set to your actual folder locations) ─────────────
set BE_DIR=C:\Users\Pramod\gc-be
set FE_DIR=C:\Users\Pramod\gc-fe
set LOG_DIR=C:\Users\Pramod\gc-be\logs
set NODE="C:\Program Files\nodejs\node.exe"
set NPX="C:\Program Files\nodejs\npx.cmd"

:: ── Create logs directory ────────────────────────────────────
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: ── Write startup timestamp ──────────────────────────────────
echo [%DATE% %TIME%] Gaming Cafe starting... >> "%LOG_DIR%\startup.log"

:: ── Kill anything already on port 3000 or 4173 ──────────────
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":3000 "') do taskkill /PID %%A /F >nul 2>&1
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":4173 "') do taskkill /PID %%A /F >nul 2>&1

timeout /t 2 /nobreak >nul

:: ── Start Backend ────────────────────────────────────────────
start "GC-Backend" /MIN cmd /k "%NODE% %BE_DIR%\src\server.js > %LOG_DIR%\backend.log 2>&1"

timeout /t 5 /nobreak >nul

:: ── Start Frontend ───────────────────────────────────────────
start "GC-Frontend" /MIN cmd /k "cd /d %FE_DIR% && %NPX% vite preview --host 0.0.0.0 > %LOG_DIR%\frontend.log 2>&1"

echo [%DATE% %TIME%] Both servers launched. >> "%LOG_DIR%\startup.log"
