#!/bin/sh
set -e

echo "=========================================="
echo " Starting Baobab Backend in Production   "
echo "=========================================="

echo "▶ Running database migrations..."
pnpm exec drizzle-kit migrate

echo "▶ Starting NestJS Production Server..."
if [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js
elif [ -f "dist/main.js" ]; then
  exec node dist/main.js
else
  echo "❌ Error: Could not find compiled main.js in dist/ or dist/src/"
  exit 1
fi
