#!/bin/bash
# 三端同時起動 / 三端同时启动
# backend:4000 + frontend:4001 + portal:4002 + admin:4003

echo "🚀 Starting ZELIX WMS (4 services)..."

# Backend
echo "  [1/4] Backend → :4000"
cd backend && npm run dev &
BACKEND_PID=$!

sleep 3

# Frontend (warehouse)
echo "  [2/4] Frontend → :4001"
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Portal (client)
echo "  [3/4] Portal → :4002"
cd ../portal && npm run dev &
PORTAL_PID=$!

# Admin (platform)
echo "  [4/4] Admin → :4003"
cd ../admin && npm run dev &
ADMIN_PID=$!

echo ""
echo "✅ All services started:"
echo "  Backend:  http://localhost:4000"
echo "  Frontend: http://localhost:4001 (倉庫端)"
echo "  Portal:   http://localhost:4002 (顧客端)"
echo "  Admin:    http://localhost:4003 (プラットフォーム端)"
echo ""
echo "Press Ctrl+C to stop all services"

# Ctrl+C で全プロセス終了 / 按 Ctrl+C 终止全部
trap "kill $BACKEND_PID $FRONTEND_PID $PORTAL_PID $ADMIN_PID 2>/dev/null; exit" INT TERM
wait
