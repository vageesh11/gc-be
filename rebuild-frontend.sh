#!/usr/bin/env bash
# ============================================================
# Run this script whenever you update frontend code
# It rebuilds and restarts the frontend service
# ============================================================
echo "Building frontend..."
cd /home/vageesh/gc-fe && npm run build

echo ""
echo "Restarting frontend service..."
systemctl --user restart gc-frontend.service

echo ""
echo "Done. Frontend rebuilt and restarted."
