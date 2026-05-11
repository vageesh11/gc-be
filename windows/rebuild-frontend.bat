@echo off
:: ============================================================
:: Gaming Cafe -- Rebuild frontend and restart it
:: Run this whenever you update frontend code
:: ============================================================

setlocal

set FE_DIR=C:\gc-fe
set LOG_DIR=C:\gc-be\logs

echo ========================================
echo   Gaming Cafe -- Rebuilding Frontend
echo ========================================
echo.

:: Step 1: Stop existing frontend
echo [1/3] Stopping existing frontend...
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":4173.*LISTENING"') do (
    taskkill /PID %%A /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Step 2: Build
echo [2/3] Building frontend (this takes ~30 seconds)...
cd /d "%FE_DIR%"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed. Check the output above.
    pause
    exit /b 1
)

:: Step 3: Restart
echo [3/3] Restarting frontend...
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
start "" /B cmd /c "cd /d "%FE_DIR%" && npx vite preview --host 0.0.0.0 >> "%LOG_DIR%\frontend.log" 2>&1"

echo.
echo Done! Frontend rebuilt and restarted.
echo Open: http://localhost:4173
echo.
timeout /t 3 /nobreak >nul
endlocal
