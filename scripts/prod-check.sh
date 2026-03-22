#!/usr/bin/env bash
# =============================================================================
# 生产环境就绪检查脚本 / 本番環境レディネスチェックスクリプト
# =============================================================================
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PASSED=0; FAILED=0; TOTAL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

run_check() {
  local name="$1"; shift; TOTAL=$((TOTAL + 1))
  printf "  %-45s " "$name"
  if output=$("$@" 2>&1); then
    echo -e "${GREEN}[PASS]${NC}"; PASSED=$((PASSED + 1))
  else
    echo -e "${RED}[FAIL]${NC}"; echo "$output" | tail -5 | sed 's/^/    > /'; FAILED=$((FAILED + 1))
  fi
}

echo -e "\n${YELLOW}  ZELIXWMS 生产环境就绪检查 / 本番レディネスチェック${NC}\n"

run_check "Backend (NestJS) TypeScript"   bash -c "cd '$ROOT_DIR/backend-nest' && npx tsc --noEmit" || true
run_check "Backend (NestJS) Tests"        bash -c "cd '$ROOT_DIR/backend-nest' && npx jest --passWithNoTests" || true
run_check "Frontend build"                bash -c "cd '$ROOT_DIR/frontend' && npm run build" || true
run_check "Admin build"                   bash -c "cd '$ROOT_DIR/admin' && npm run build" || true
run_check "Portal build"                  bash -c "cd '$ROOT_DIR/portal' && npm run build" || true
run_check "Docker Compose config"         bash -c "cd '$ROOT_DIR' && docker compose config --quiet" || true
run_check "Drizzle migrations"            test -d "$ROOT_DIR/backend-nest/drizzle" || true
run_check "Nginx config"                  test -f "$ROOT_DIR/nginx/nginx.conf" || true

echo -e "\n  总计: $TOTAL | ${GREEN}通过: $PASSED${NC} | ${RED}失败: $FAILED${NC}\n"
[ "$FAILED" -eq 0 ] && echo -e "  ${GREEN}✅ All checks passed${NC}" && exit 0
echo -e "  ${RED}❌ $FAILED checks failed${NC}" && exit 1
