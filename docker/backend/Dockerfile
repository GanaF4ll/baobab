FROM node:26-alpine

RUN npm install -g pnpm@9

WORKDIR /app

ENV CI=true

RUN apk add --no-cache curl

# Copy dependency files
COPY backend/package.json backend/pnpm-lock.yaml* backend/.npmrc* ./

RUN pnpm config set minimum-release-age 0 && \
    pnpm install --frozen-lockfile

# Copy source code
COPY backend/ .

EXPOSE 2400

# Shell form to avoid Node.js entrypoint issues
CMD pnpm run start:dev
