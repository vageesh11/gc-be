@echo off
:: ============================================================
:: Gaming Cafe -- One-Time Windows Setup
:: Run this ONCE after cloning the repo on a new Windows machine
:: Run as Administrator (right-click -> Run as administrator)
:: ============================================================

setlocal

set BE_DIR=C:\Users\Pramod\gc-be
set FE_DIR=C:\Users\Pramod\gc-fe
set LOG_DIR=C:\Users\Pramod\gc-be\logs

echo ============================================================
echo   Gaming Cafe -- Windows Setup
echo   Run this once on a new machine
echo ============================================================
echo.

:: ── Check Node.js ──────────────────────────────────────��─────
echo [CHECK] Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js not found.
    echo Please install from https://nodejs.org ^(LTS version^)
    echo Then re-run this script.
    pause
    exit /b 1
)
echo   Node.js OK:
node --version

:: ── Check psql ───────────────────────────────────────────────
echo [CHECK] PostgreSQL...
psql --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: psql not found.
    echo Please install PostgreSQL from https://www.postgresql.org/download/windows/
    echo And make sure "C:\Program Files\PostgreSQL\<version>\bin" is in your PATH
    pause
    exit /b 1
)
echo   PostgreSQL OK:
psql --version

:: ── Check .env exists ────────────────────────────────────────
echo.
echo [CHECK] .env file...
if not exist "%BE_DIR%\.env" (
    echo ERROR: .env file not found at %BE_DIR%\.env
    echo.
    echo Please create %BE_DIR%\.env with contents:
    echo.
    echo   NODE_ENV=production
    echo   PORT=3000
    echo   DB_HOST=localhost
    echo   DB_PORT=5432
    echo   DB_NAME=gaming_cafe
    echo   DB_USER=your_pg_username
    echo   DB_PASSWORD=your_pg_password
    echo   DB_POOL_MIN=2
    echo   DB_POOL_MAX=10
    echo   JWT_SECRET=gc_jwt_super_secret_change_this
    echo   JWT_EXPIRES_IN=8h
    echo.
    pause
    exit /b 1
)
echo   .env found OK

:: ── Read DB credentials from .env ────────────────────────────
for /f "tokens=2 delims==" %%A in ('findstr /i "^DB_USER=" "%BE_DIR%\.env"')     do set DB_USER=%%A
for /f "tokens=2 delims==" %%A in ('findstr /i "^DB_PASSWORD=" "%BE_DIR%\.env"') do set DB_PASSWORD=%%A
for /f "tokens=2 delims==" %%A in ('findstr /i "^DB_NAME=" "%BE_DIR%\.env"')     do set DB_NAME=%%A
for /f "tokens=2 delims==" %%A in ('findstr /i "^DB_HOST=" "%BE_DIR%\.env"')     do set DB_HOST=%%A
for /f "tokens=2 delims==" %%A in ('findstr /i "^DB_PORT=" "%BE_DIR%\.env"')     do set DB_PORT=%%A

echo   DB: %DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%

:: ── Install backend dependencies ─────────────────────────────
echo.
echo [1/5] Installing backend dependencies...
cd /d "%BE_DIR%"
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install failed for backend.
    pause
    exit /b 1
)
echo   Backend dependencies installed.

:: ── Run DB migrations ────────────────────────────────────────
echo.
echo [2/5] Running database migrations...
cd /d "%BE_DIR%"
node scripts/migrate.js
if %ERRORLEVEL% neq 0 (
    echo ERROR: Migration failed.
    pause
    exit /b 1
)
echo   Migrations completed.

:: ── Run seeds ────────────────────────────────────────────────
echo.
echo [3/5] Seeding database...
cd /d "%BE_DIR%"
node scripts/seed.js
if %ERRORLEVEL% neq 0 (
    echo ERROR: Seed failed.
    pause
    exit /b 1
)
echo   Seed data inserted.

:: ── Install frontend dependencies ────────────────────────────
echo.
echo [4/5] Installing frontend dependencies...
cd /d "%FE_DIR%"
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install failed for frontend.
    pause
    exit /b 1
)
echo   Frontend dependencies installed.

:: ── Build frontend ───────────────────────────────────────────
echo.
echo [5/5] Building frontend (compiled, source not exposed)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)
echo   Frontend built.

:: ── Create logs directory ────────────────────────────────────
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: ── Register Task Scheduler ──────────────────────────────────
echo.
echo [FINAL] Registering auto-start with Task Scheduler...
schtasks /delete /tn "GamingCafe" /f >nul 2>&1
schtasks /create /tn "GamingCafe" /tr "%BE_DIR%\windows\start-cafe.bat" /sc onlogon /ru "%USERNAME%" /rl highest /f
if %ERRORLEVEL% neq 0 (
    echo WARNING: Could not register Task Scheduler task.
    echo You can do it manually -- see windows\task-scheduler.xml
) else (
    echo   Auto-start registered. App will start on every login.
)

:: ── Create Desktop shortcut ──────────────────────────────────
echo.
echo [EXTRA] Creating desktop shortcut...
set SHORTCUT=%USERPROFILE%\Desktop\Gaming Cafe.url
echo [InternetShortcut] > "%SHORTCUT%"
echo URL=http://localhost:4173 >> "%SHORTCUT%"
echo   Desktop shortcut created.

echo.
echo ============================================================
echo   SETUP COMPLETE!
echo ============================================================
echo.
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:4173
echo.
echo   Admin login:    admin / admin123
echo   Operator login: operator / operator123
echo.
echo   Starting servers now...
echo.
call "%BE_DIR%\windows\start-cafe.bat"
echo   Servers started. Open http://localhost:4173 in your browser.
echo.
pause
endlocal
goto :eof
