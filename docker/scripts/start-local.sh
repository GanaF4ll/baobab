#!/bin/sh
set -e

echo "▶ Generating migrations..."
pnpm exec drizzle-kit generate

echo "▶ Running migrations..."
pnpm exec drizzle-kit migrate

echo "▶ Seeding database..."
pnpm run seed

echo "▶ Starting NestJS..."
pnpm run start:dev
