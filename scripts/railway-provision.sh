#!/usr/bin/env bash
# Cấu hình nhanh Railway + deploy (chạy trên máy có RAILWAY_TOKEN).
#
#   export RAILWAY_TOKEN="..."   # Project Token: Railway → Project → Settings → Tokens
#   ./scripts/railway-provision.sh
#
# Bắt buộc trên Railway (một lần): service **api** và **web** → Settings → Source →
#   **Root Directory = để trống** (clone cả repo). Nếu còn `apps/api` / `apps/web`,
#   CLI `railway up .` sẽ lỗi hoặc Docker COPY sai.
#
# Tuỳ chọn:
#   RAILWAY_JWT_SECRET   — nếu không set, script tạo chuỗi ngẫu nhiên (in ra một lần).
#   RAILWAY_POSTGRES_SERVICE — mặc định Postgres (đổi nếu DB tên khác).
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

WEB_URL="${RAILWAY_WEB_URL:-https://web-production-831d3.up.railway.app}"
API_URL="${RAILWAY_API_URL:-https://api-production-cafe.up.railway.app}"

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "Thiếu RAILWAY_TOKEN. Railway → Project game → Settings → Tokens"
  exit 1
fi
if [[ -z "$PROJECT_ID" ]]; then
  echo "Thiếu projectId (.railway/project.json hoặc RAILWAY_PROJECT_ID)"
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

DB_REF="\${{${POSTGRES}.DATABASE_URL}}"
echo "→ api: DATABASE_URL, FRONTEND_URL, JWT_SECRET, RAILWAY_DOCKERFILE_PATH"

# shellcheck disable=SC2086
$CLI variable set \
  "DATABASE_URL=${DB_REF}" \
  "FRONTEND_URL=${WEB_URL}" \
  "RAILWAY_DOCKERFILE_PATH=Dockerfile.api" \
  --service api \
  --environment "$ENV" \
  --project "$PROJECT_ID"

printf '%s' "$JWT" | $CLI variable set JWT_SECRET --stdin \
  --service api \
  --environment "$ENV" \
  --project "$PROJECT_ID"

echo "→ web: VITE_API_URL, RAILWAY_DOCKERFILE_PATH"

# shellcheck disable=SC2086
$CLI variable set \
  "VITE_API_URL=${API_URL}" \
  "RAILWAY_DOCKERFILE_PATH=Dockerfile.web" \
  --service web \
  --environment "$ENV" \
  --project "$PROJECT_ID"

if [[ "${SKIP_GH_SECRET:-}" != "1" ]] && command -v gh >/dev/null 2>&1; then
  if gh auth status &>/dev/null; then
    echo "→ gh secret set VITE_API_URL"
    printf '%s' "$API_URL" | gh secret set VITE_API_URL 2>/dev/null || \
      echo "   (bỏ qua nếu không có quyền repo)"
  else
    echo "→ chưa gh auth login — bỏ qua gh secret"
  fi
else
  echo "→ Gợi ý: printf '%s' URL | gh secret set VITE_API_URL"
fi

echo ""
echo "=== Kiểm tra dashboard Railway ==="
echo "Source → Root Directory: ĐỂ TRỐNG (cả api và web). Xóa Watch Paths hoặc để **."
echo "Config as code: có thể tắt nếu dùng Dockerfile.api / Dockerfile.web."
echo ""

if [[ "${SKIP_DEPLOY:-}" != "1" ]]; then
  echo "→ Deploy API (full repo)…"
  cd "$ROOT"
  # shellcheck disable=SC2086
  $CLI up . --environment "$ENV" --service api --project "$PROJECT_ID" \
    --detach --message "provision api $(date -u +%Y-%m-%dT%H:%MZ)"

  echo "→ Deploy web…"
  export VITE_API_URL="$API_URL"
  # shellcheck disable=SC2086
  $CLI up . --environment "$ENV" --service web --project "$PROJECT_ID" \
    --detach --message "provision web $(date -u +%Y-%m-%dT%H:%MZ)"

  echo ""
  echo "Xong. web: $WEB_URL · api: $API_URL"
  echo "API Shell (một lần): npm run db:seed"
else
  echo "SKIP_DEPLOY=1 — chỉ đã set biến."
fi
