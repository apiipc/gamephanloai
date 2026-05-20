#!/usr/bin/env bash
# Cấu hình nhanh Railway + deploy (chạy trên máy có RAILWAY_TOKEN).
#
#   export RAILWAY_TOKEN="..."   # Project Token: Railway → Project → Settings → Tokens
#   ./scripts/railway-provision.sh
#
# Tuỳ chọn:
#   RAILWAY_JWT_SECRET   — nếu không set, script tạo chuỗi ngẫu nhiên (in ra một lần).
#   RAILWAY_POSTGRES_SERVICE — mặc định Postgres (đổi nếu DB tên khác, vd. Postgres-rMPd).
#   SKIP_GH_SECRET=1     — không gọi gh secret set VITE_API_URL
#   SKIP_DEPLOY=1        — chỉ set biến, không railway up
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="npx --yes @railway/cli@latest"
PROJECT_ID="${RAILWAY_PROJECT_ID:-}"
if [[ -z "$PROJECT_ID" && -f "$ROOT/.railway/project.json" ]]; then
  PROJECT_ID="$(cd "$ROOT" && node -p "require('./.railway/project.json').projectId")"
fi
ENV="${RAILWAY_ENVIRONMENT:-production}"
POSTGRES="${RAILWAY_POSTGRES_SERVICE:-Postgres}"

# URL công khai (Railway → service → Networking). Sửa nếu domain khác.
WEB_URL="${RAILWAY_WEB_URL:-https://web-production-831d3.up.railway.app}"
API_URL="${RAILWAY_API_URL:-https://api-production-cafe.up.railway.app}"

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "Thiếu RAILWAY_TOKEN. Lấy tại: Railway → Project game → Settings → Tokens → Create project token"
  exit 1
fi
if [[ -z "$PROJECT_ID" ]]; then
  echo "Thiếu projectId (thêm .railway/project.json hoặc export RAILWAY_PROJECT_ID=...)"
  exit 1
fi

echo "→ Project: $PROJECT_ID · Environment: $ENV"

JWT="${RAILWAY_JWT_SECRET:-}"
if [[ -z "$JWT" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    JWT="$(openssl rand -base64 32)"
  else
    JWT="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
  fi
  echo "→ JWT_SECRET mới (lưu lại nếu cần): $JWT"
fi

# Tham chiếu DB Railway: tên service Postgres trên canvas
DB_REF="\${{${POSTGRES}.DATABASE_URL}}"
echo "→ api DATABASE_URL = $DB_REF"

echo "→ api: DATABASE_URL, FRONTEND_URL, JWT_SECRET"

# shellcheck disable=SC2086
$CLI variable set \
  "DATABASE_URL=${DB_REF}" \
  "FRONTEND_URL=${WEB_URL}" \
  --service api \
  --environment "$ENV" \
  --project "$PROJECT_ID"

printf '%s' "$JWT" | $CLI variable set JWT_SECRET --stdin \
  --service api \
  --environment "$ENV" \
  --project "$PROJECT_ID"

# shellcheck disable=SC2086
$CLI variable set \
  "VITE_API_URL=${API_URL}" \
  --service web \
  --environment "$ENV" \
  --project "$PROJECT_ID"

if [[ "${SKIP_GH_SECRET:-}" != "1" ]] && command -v gh >/dev/null 2>&1; then
  if gh auth status &>/dev/null; then
    echo "→ gh secret set VITE_API_URL (GitHub Actions build web)"
    printf '%s' "$API_URL" | gh secret set VITE_API_URL 2>/dev/null || \
      echo "   (bỏ qua nếu không có quyền repo; set tay: printf %s URL | gh secret set VITE_API_URL)"
  else
    echo "→ chưa gh auth login — bỏ qua gh secret (tùy chọn)"
  fi
else
  echo "→ Gợi ý: gh secret set VITE_API_URL (để Actions embed API URL khi build)"
fi

echo ""
echo "=== (Tuỳ chọn) Dashboard Railway ==="
echo "Nếu deploy vẫn fail ở Snapshot/config: Config as code → thử railway.toml hoặc /apps/api/railway.toml (repo đã có apps/*/apps/*/railway.toml)."
echo ""

if [[ "${SKIP_DEPLOY:-}" != "1" ]]; then
  echo "→ Deploy API…"
  cd "$ROOT"
  # shellcheck disable=SC2086
  $CLI up ./apps/api --path-as-root --environment "$ENV" --service api --project "$PROJECT_ID" \
    --detach --message "provision api $(date -u +%Y-%m-%dT%H:%MZ)"

  echo "→ Deploy web…"
  export VITE_API_URL="$API_URL"
  # shellcheck disable=SC2086
  $CLI up ./apps/web --path-as-root --environment "$ENV" --service web --project "$PROJECT_ID" \
    --detach --message "provision web $(date -u +%Y-%m-%dT%H:%MZ)"

  echo ""
  echo "Xong. Xem log trên Railway; web: $WEB_URL · api: $API_URL"
  echo "Sau khi api lên: Shell service api → npm run db:seed (một lần)."
else
  echo "SKIP_DEPLOY=1 — chỉ đã set biến. Redeploy tay trên Railway hoặc chạy lại không có SKIP_DEPLOY."
fi
