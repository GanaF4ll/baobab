#!/bin/sh
set -e

echo "=========================================="
echo " Starting Baobab Backend in Development  "
echo "=========================================="

echo "▶ Generating migrations..."
pnpm exec drizzle-kit generate

echo "▶ Running migrations..."
pnpm exec drizzle-kit migrate

echo "▶ Seeding database..."
pnpm run seed

# Trap signals for graceful shutdown
pid=0
term_handler() {
  if [ "$pid" -ne 0 ]; then
    echo "▶ Stopping NestJS server (PID: $pid)..."
    kill -SIGTERM "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  exit 143
}
trap 'term_handler' SIGTERM SIGINT

echo "▶ Starting NestJS in watch mode..."
PORT_NUM="${PORT:-2400}"
pnpm run start:dev &
pid="$!"

# Background task to generate OpenAPI client once NestJS is ready
(
  echo "▶ Waiting for NestJS and Swagger JSON on port ${PORT_NUM} to generate OpenAPI client..."
  max_attempts=30
  attempt=0
  until curl -sf "http://127.0.0.1:${PORT_NUM}/swagger-json" > /dev/null 2>&1 || curl -sf "http://localhost:${PORT_NUM}/swagger-json" > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "⚠️ Timeout waiting for Swagger endpoint"
      exit 0
    fi
    sleep 1
  done

  echo "✅ NestJS is ready. Generating OpenAPI client for frontend..."
  if [ -f "/app/frontend/openapi.config.ts" ]; then
    (cd /app/frontend && pnpm run generate:api) || echo "⚠️ Warning: Failed to generate OpenAPI client in /app/frontend"
  elif [ -f "../frontend/openapi.config.ts" ]; then
    (cd ../frontend && pnpm run generate:api) || echo "⚠️ Warning: Failed to generate OpenAPI client in ../frontend"
  fi
) &

wait "$pid"
