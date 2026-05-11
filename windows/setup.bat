@echo off
:: ============================================================
:: Gaming Cafe -- One-Time Windows Setup
:: Run this ONCE after cloning the repo on a new Windows machine
:: Run as Administrator (right-click -> Run as administrator)
:: ============================================================

setlocal

set BE_DIR=C:\gc-be
set FE_DIR=C:\gc-fe
set LOG_DIR=C:\gc-be\logs

echo ============================================================
echo   Gaming Cafe -- Windows Setup
echo   Run this once on a new machine
echo ============================================================
echo.

:: ── Check Node.js ────────────────────────────────────────────
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

:: ── Run DB migrations ─────────────────────────────────────────
echo.
echo [2/5] Running database migrations...
set PGPASSWORD=%DB_PASSWORD%

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BE_DIR%\database\migrations\001_initial_schema.sql"
if %ERRORLEVEL% neq 0 goto :migration_error

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BE_DIR%\database\migrations\002_feature_additions.sql"
if %ERRORLEVEL% neq 0 goto :migration_error

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BE_DIR%\database\migrations\003_table_pricing_and_discounts.sql"
if %ERRORLEVEL% neq 0 goto :migration_error

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BE_DIR%\database\migrations\004_reserved_status.sql"
if %ERRORLEVEL% neq 0 goto :migration_error

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BE_DIR%\database\migrations\005_payment_method.sql"
if %ERRORLEVEL% neq 0 goto :migration_error

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BE_DIR%\database\migrations\006_cash_online_amounts.sql"
if %ERRORLEVEL% neq 0 goto :migration_error

echo   All migrations applied.

:: ── Run seeds ─────────────────────────────────────────────────
echo.
echo [3/5] Seeding database...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BE_DIR%\database\seeds\seed.sql"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BE_DIR%\database\seeds\users.sql"
echo   Seed data inserted.

:: ── Install frontend dependencies ─────────────────────────────
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

:: ── Build frontend ─────────────────────────────────────────────
echo.
echo [5/5] Building frontend (compiled, source not exposed)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)
echo   Frontend built.

:: ── Create logs directory ──────────────────────────────────────
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: ── Register Task Scheduler ────────────────────────────────────
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

:: ── Create Desktop shortcut ─────────────────────────────────────
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

:migration_error
echo ERROR: Migration failed. Check PostgreSQL connection and credentials in .env
pause
exit /b 1
