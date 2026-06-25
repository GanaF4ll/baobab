FROM node:26-alpine

RUN npm install -g pnpm@10

WORKDIR /app

ENV CI=true

# Copy workspace-level dependency files (monorepo root lockfile)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend/

RUN pnpm config set minimum-release-age 0 && \
    pnpm install --frozen-lockfile --filter frontend

# Copy source code
COPY frontend/ ./frontend/

WORKDIR /app/frontend

EXPOSE 3000

# Shell form to avoid Node.js entrypoint issues
CMD pnpm run start --host 0.0.0.0 --port 3000
