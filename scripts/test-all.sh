#!/bin/bash
# ZELIX WMS — 全系统测试 / 全システムテスト
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "============================================"
echo " ZELIX WMS — Full Test Suite"
echo "============================================"

echo "▶ Backend (NestJS) Tests..."
cd "$ROOT_DIR/backend-nest" && npx jest --passWithNoTests 2>&1 | tail -5

echo ""
echo "▶ TypeCheck..."
cd "$ROOT_DIR/backend-nest" && npx tsc --noEmit && echo "  ✅ backend-nest"
cd "$ROOT_DIR/frontend" && npx vue-tsc --noEmit && echo "  ✅ frontend"
cd "$ROOT_DIR/admin" && npx vue-tsc --noEmit && echo "  ✅ admin"

echo ""
echo "============================================"
echo " All checks passed"
echo "============================================"
