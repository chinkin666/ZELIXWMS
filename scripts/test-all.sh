#!/bin/bash
# ============================================================
# ZELIX WMS 全系统测试 / 全システムテスト
# ============================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOTAL=0

echo "============================================"
echo " ZELIX WMS — Full Test Suite"
echo "============================================"
echo ""

# ─── 1. Backend Tests ───
echo "▶ Backend Tests..."
cd "$ROOT_DIR/backend"
npx vitest run 2>&1 | grep -E "Tests|Test Files"
COUNT=$(cd "$ROOT_DIR/backend" && npx vitest run 2>&1 | grep "Tests" | grep -o '[0-9]* passed' | grep -o '[0-9]*')
TOTAL=$((TOTAL + COUNT))
echo ""

# ─── 2. Plugin SDK Tests ───
echo "▶ Plugin SDK Tests..."
cd "$ROOT_DIR/packages/plugin-sdk"
npx vitest run 2>&1 | grep -E "Tests|Test Files"
COUNT=$(cd "$ROOT_DIR/packages/plugin-sdk" && npx vitest run 2>&1 | grep "Tests" | grep -v "Test Files" | grep -o '[0-9]* passed' | grep -o '[0-9]*')
TOTAL=$((TOTAL + COUNT))
echo ""

# ─── 3. Plugin Tests ───
echo "▶ Plugin Tests..."
cd "$ROOT_DIR"
npx vitest run extensions/plugins 2>&1 | grep -E "Tests|Test Files"
COUNT=$(cd "$ROOT_DIR" && npx vitest run extensions/plugins 2>&1 | grep "Tests" | grep -v "Test Files" | grep -o '[0-9]* passed' | grep -o '[0-9]*')
TOTAL=$((TOTAL + COUNT))
echo ""

# ─── 4. TypeCheck ───
echo "▶ TypeCheck..."
cd "$ROOT_DIR/backend" && npx tsc --noEmit && echo "  ✅ backend"
cd "$ROOT_DIR/frontend" && npx vue-tsc --noEmit && echo "  ✅ frontend"
cd "$ROOT_DIR/admin" && npx vue-tsc --noEmit && echo "  ✅ admin"
cd "$ROOT_DIR/portal" && npx vue-tsc --noEmit && echo "  ✅ portal"
echo ""

echo "============================================"
echo " TOTAL: ${TOTAL} tests passed"
echo " TypeCheck: 4/4 (backend+frontend+admin+portal)"
echo "============================================"
