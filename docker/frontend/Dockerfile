FROM node:26-alpine

RUN npm install -g pnpm@10 && \
    apk add --no-cache curl

WORKDIR /app

ENV CI=true

# Copy workspace-level dependency files (monorepo root lockfile)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/

RUN pnpm config set minimum-release-age 0 && \
    pnpm install --frozen-lockfile --filter frontend

# Copy source code
COPY frontend/ ./frontend/

# Copy startup script
COPY docker/scripts/start-frontend-local.sh /scripts/start-frontend-local.sh
RUN chmod +x /scripts/start-frontend-local.sh

WORKDIR /app/frontend

EXPOSE 3000

CMD ["sh", "/scripts/start-frontend-local.sh"]
