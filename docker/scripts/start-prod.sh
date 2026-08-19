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

echo "NestJS running on port ${PORT_NUM} (PID: $pid)"

# 4. Keep container alive and attached to NestJS process
wait "$pid"
