#!/bin/sh
set -e

echo "=========================================="
echo " Starting Baobab Backend in Production   "
echo "=========================================="

# 1. Run database migrations
echo "▶ Running database migrations..."
pnpm exec drizzle-kit migrate

# 2. Trap signals for graceful shutdown
pid=0
term_handler() {
  if [ "$pid" -ne 0 ]; then
    echo "▶ Gracefully stopping NestJS server (PID: $pid)..."
    kill -SIGTERM "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  exit 143
}
trap 'term_handler' SIGTERM SIGINT

# 3. Start NestJS in background
echo "▶ Starting NestJS Production Server..."
PORT_NUM="${PORT:-2400}"

if [ -f "dist/src/main.js" ]; then
  node dist/src/main.js &
  pid="$!"
elif [ -f "dist/main.js" ]; then
  node dist/main.js &
  pid="$!"
else
  echo "❌ Error: Could not find compiled main.js in dist/ or dist/src/"
  exit 1
fi

# 4. Wait for NestJS server and Swagger to be ready
echo "▶ Waiting for NestJS and Swagger JSON to be ready on port ${PORT_NUM}..."
max_attempts=30
attempt=0
until curl -sf "http://127.0.0.1:${PORT_NUM}/swagger-json" > /dev/null 2>&1 || curl -sf "http://localhost:${PORT_NUM}/swagger-json" > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "⚠️ Warning: Timeout waiting for Swagger endpoint at http://localhost:${PORT_NUM}/swagger-json"
    break
  fi
  sleep 1
done

# 5. Generate OpenAPI services for frontend if available
if [ "$attempt" -lt "$max_attempts" ]; then
  echo "✅ NestJS is ready and Swagger endpoint is available."

  echo "▶ Generating OpenAPI client for frontend..."
  if [ -f "/app/frontend/openapi.config.ts" ]; then
    (cd /app/frontend && pnpm run generate:api) || echo "⚠️ Warning: Failed to generate OpenAPI client in /app/frontend"
  elif [ -f "../frontend/openapi.config.ts" ]; then
    (cd ../frontend && pnpm run generate:api) || echo "⚠️ Warning: Failed to generate OpenAPI client in ../frontend"
  elif [ -f "frontend/openapi.config.ts" ]; then
    (cd frontend && pnpm run generate:api) || echo "⚠️ Warning: Failed to generate OpenAPI client in frontend"
  else
    echo "ℹ️ Frontend config not found in current path, skipping OpenAPI generation."
  fi
fi

echo "🚀 NestJS running on port ${PORT_NUM} (PID: $pid)"

# 6. Keep container alive and attached to NestJS process
wait "$pid"
