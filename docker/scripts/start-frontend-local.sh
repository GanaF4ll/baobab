#!/bin/sh
set -e

echo "=========================================="
echo " Starting Baobab Frontend [DEV] "
echo "=========================================="

PORT_NUM="${PORT:-3000}"
SWAGGER_ENDPOINT="${SWAGGER_URL:-${BACKEND_INTERNAL_URL:-http://baobab-backend:2400}/swagger-json}"

echo "▶ Waiting for Backend Swagger JSON at ${SWAGGER_ENDPOINT}..."
max_attempts=60
attempt=0
until curl -sf "${SWAGGER_ENDPOINT}" > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "⚠️ Warning: Timeout waiting for Swagger endpoint at ${SWAGGER_ENDPOINT}. Proceeding with existing client..."
    break
  fi
  sleep 2
done

if [ "$attempt" -lt "$max_attempts" ]; then
  echo "Backend ready. Generating OpenAPI client..."
  SWAGGER_URL="${SWAGGER_ENDPOINT}" pnpm run generate:api || echo "Warning: Failed to generate OpenAPI client, proceeding with existing files..."
else
  echo "Skipping OpenAPI regeneration due to timeout."
fi
echo "▶ Starting Angular dev server on port ${PORT_NUM}..."
exec pnpm run start --host 0.0.0.0 --port "${PORT_NUM}"
