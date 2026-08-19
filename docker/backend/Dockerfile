FROM node:26-alpine

RUN npm install -g pnpm@10

WORKDIR /app

ENV CI=true

RUN apk add --no-cache curl

# Copy workspace-level dependency files (monorepo root lockfile)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY backend/package.json ./backend/

RUN pnpm config set minimum-release-age 0 && \
    pnpm install --frozen-lockfile --filter backend

# Copy source code
COPY backend/ ./backend/

# Copy startup scripts
COPY docker/scripts/start-local.sh /scripts/start-local.sh
RUN sed -i 's/\r$//' /scripts/start-local.sh && chmod +x /scripts/start-local.sh

WORKDIR /app/backend

EXPOSE 2400

# Shell form to avoid Node.js entrypoint issues
CMD ["sh", "/scripts/start-local.sh"]
