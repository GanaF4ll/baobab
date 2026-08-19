#!/bin/sh
set -e

echo "=========================================="
echo " Starting Baobab Frontend [PROD]   "
echo "=========================================="

PORT_NUM="${PORT:-3000}"
SWAGGER_ENDPOINT="${SWAGGER_URL:-${BACKEND_INTERNAL_URL:-http://baobab-backend:2400}/swagger-json}"

# 1. Wait for Backend Swagger JSON endpoint
echo "▶ Waiting for Backend Swagger JSON at ${SWAGGER_ENDPOINT}..."
max_attempts=60
attempt=0
until curl -sf "${SWAGGER_ENDPOINT}" > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo " Warning: Timeout waiting for Swagger endpoint at ${SWAGGER_ENDPOINT}. Proceeding with existing client if present..."
    break
  fi
  sleep 2
done

# 2. Generate OpenAPI client if backend is reachable
if [ "$attempt" -lt "$max_attempts" ]; then
  echo "Backend is ready. Generating OpenAPI client..."
  SWAGGER_URL="${SWAGGER_ENDPOINT}" pnpm run generate:api || echo " Warning: Failed to generate OpenAPI client, proceeding with existing files..."
else
  echo "ℹ Skipping OpenAPI regeneration due to timeout, building with existing client."
fi

# 3. Build Angular application for production
echo "▶ Building Angular application for production..."
pnpm run build --configuration production

# 4. Start static file server
echo "▶ Starting Frontend server on port ${PORT_NUM}..."
exec pnpm exec serve -s dist/frontend/browser -l "${PORT_NUM}"
