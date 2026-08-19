#!/bin/sh
set -e

CLIENT_DIR="./src/client"

echo "▶ Cleaning existing OpenAPI client at ${CLIENT_DIR}..."
rm -rf "${CLIENT_DIR}"

echo "▶ Generating OpenAPI client..."
pnpm exec ng-openapi -c ./openapi.config.ts
