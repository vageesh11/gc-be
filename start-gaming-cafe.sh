#!/usr/bin/env bash
# ============================================================
# Gaming Café — Start Backend + Frontend
# Double-click the desktop icon to launch both servers
# ============================================================

BE_DIR="/home/vageesh/gc-be"
FE_DIR="/home/vageesh/gc-fe"

# Read backend port from .env
BE_PORT=3000
if [ -f "$BE_DIR/.env" ]; then
  LOADED=$(grep '^PORT=' "$BE_DIR/.env" | cut -d= -f2 | tr -d '[:space:]')
  [ -n "$LOADED" ] && BE_PORT=$LOADED
fi

# ── Launch Backend ───────────────────────────────────────────
/usr/bin/gnome-terminal \
  --disable-factory \
  --title="Gaming Café — Backend (Port $BE_PORT)" \
  -- bash -c "
    cd '$BE_DIR'
    echo '========================================'
    echo '  Gaming Café Backend'
    echo '  http://localhost:$BE_PORT/api/health'
    echo '========================================'
    npm run dev
    echo ''
    echo 'Server stopped. Press Enter to close.'
    read
  " &

sleep 2

# ── Launch Frontend ──────────────────────────────────────────
/usr/bin/gnome-terminal \
  --disable-factory \
  --title="Gaming Café — Frontend" \
  -- bash -c "
    cd '$FE_DIR'
    echo '========================================'
    echo '  Gaming Café Frontend'
    echo '========================================'
    npm run dev
    echo ''
    echo 'Server stopped. Press Enter to close.'
    read
  " &

echo "Gaming Café servers are starting..."
