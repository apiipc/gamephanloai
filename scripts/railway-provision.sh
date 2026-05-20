#!/usr/bin/env bash
# Cấu hình nhanh Railway + deploy **một service** (web + API gộp, Dockerfile gốc).
#
#   export RAILWAY_TOKEN="..."   # Project Token: Railway → Project → Settings → Tokens
#   export RAILWAY_APP_URL="https://<domain-service-bạn>.up.railway.app"
#   ./scripts/railway-provision.sh
#
# Bắt buộc trên Railway: service (mặc định **api**) → Settings → Source → **Root Directory = để trống**.
#
# Tuỳ chọn:
#   RAILWAY_JWT_SECRET   — nếu không set, script tạo chuỗi ngẫu nhiên (in ra một lần).
#   RAILWAY_POSTGRES_SERVICE — mặc định Postgres (đổi nếu DB tên khác).
#   RAILWAY_SERVICE      — tên service (mặc định `api`).
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
SERVICE="${RAILWAY_SERVICE:-api}"

APP_URL="${RAILWAY_APP_URL:-}"
if [[ -z "$APP_URL" ]]; then
  echo "Thiếu RAILWAY_APP_URL (URL public của service sau Generate Domain), vd:"
  echo "  export RAILWAY_APP_URL=\"https://api-production-xxxx.up.railway.app\""
  exit 1
fi

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "Thiếu RAILWAY_TOKEN. Railway → Project → Settings → Tokens"
  exit 1
fi
if [[ -z "$PROJECT_ID" ]]; then
  echo "Thiếu projectId (.railway/project.json hoặc RAILWAY_PROJECT_ID)"
  exit 1
fi

echo "→ Project: $PROJECT_ID · Environment: $ENV · Service: $SERVICE"

JWT="${RAILWAY_JWT_SECRET:-}"
if [[ -z "$JWT" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    JWT="$(openssl rand -base64 32)"
  else
    JWT="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
  fi
  echo "→ JWT_SECRET mới (lưu lại nếu cần): $JWT"
fi

DB_REF="\${{${POSTGRES}.DATABASE_URL}}"
echo "→ ${SERVICE}: DATABASE_URL, FRONTEND_URL, JWT_SECRET (Dockerfile unified ở gốc repo)"

# Không dùng Dockerfile.web trên service chính.
$CLI variable delete RAILWAY_DOCKERFILE_PATH --service "$SERVICE" --environment "$ENV" --project "$PROJECT_ID" 2>/dev/null || true

# shellcheck disable=SC2086
$CLI variable set \
  "DATABASE_URL=${DB_REF}" \
  "FRONTEND_URL=${APP_URL}" \
  --service "$SERVICE" \
  --environment "$ENV" \
  --project "$PROJECT_ID"

printf '%s' "$JWT" | $CLI variable set JWT_SECRET --stdin \
  --service "$SERVICE" \
  --environment "$ENV" \
  --project "$PROJECT_ID"

echo ""
echo "=== Kiểm tra dashboard Railway ==="
echo "- Chỉ cần **một** service app (vd. $SERVICE) + Postgres."
echo "- Source → Root Directory: **trống**. Có thể xoá service **web** cũ nếu không dùng."
echo "- FRONTEND_URL phải trùng URL bạn mở trên trình duyệt (thường = public URL của $SERVICE)."
echo ""

if [[ "${SKIP_DEPLOY:-}" != "1" ]]; then
  echo "→ Deploy (full repo, một image)…"
  cd "$ROOT"
  # shellcheck disable=SC2086
  # Không truyền path `.` — tránh lỗi "prefix not found" trên một số bản Railway CLI
  $CLI up --environment "$ENV" --service "$SERVICE" --project "$PROJECT_ID" \
    --detach --message "unified deploy $(date -u +%Y-%m-%dT%H:%MZ)"

  echo ""
  echo "Xong. Mở: $APP_URL"
  echo "API Shell (một lần): npm run db:seed"
else
  echo "SKIP_DEPLOY=1 — chỉ đã set biến."
fi
