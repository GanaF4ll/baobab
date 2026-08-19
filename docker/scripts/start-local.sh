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

echo "NestJS running in dev mode on port ${PORT_NUM} (PID: $pid)"

wait "$pid"
