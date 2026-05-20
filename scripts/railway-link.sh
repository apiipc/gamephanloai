#!/usr/bin/env bash
# Liên kết thư mục local với project Railway (chạy trên máy bạn).
#
# Cách 1 — đăng nhập tài khoản (khuyến nghị):
#   npx @railway/cli login
#   ./scripts/railway-link.sh
#
# Cách 2 — project token (Settings → Tokens, KHÔNG gửi token cho ai):
#   export RAILWAY_TOKEN="your-token-here"
#   ./scripts/railway-link.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ID="1323cca9-cdce-4443-b158-f6f7c903a453"
CLI="npx @railway/cli@latest"

echo "→ Link API (apps/api)..."
cd "$ROOT/apps/api"
$CLI link -p "$PROJECT_ID" -e production -s api 2>/dev/null || $CLI link -p "$PROJECT_ID" -e production

echo "→ Link Web (apps/web)..."
cd "$ROOT/apps/web"
$CLI link -p "$PROJECT_ID" -e production -s web 2>/dev/null || $CLI link -p "$PROJECT_ID" -e production

echo "Xong. Deploy từ gốc repo (để Railway thấy apps/*/railway.toml):"
echo "     cd \"$ROOT\" && railway up . --service api"
echo "     cd \"$ROOT\" && railway up . --service web"
