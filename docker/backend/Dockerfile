FROM node:26-alpine

RUN npm install -g pnpm

WORKDIR /app

RUN apk add --no-cache curl

# Copy dependency files
COPY backend/package.json backend/pnpm-lock.yaml* ./

RUN pnpm config set minimum-release-age 0 && pnpm install --ignore-scripts

# Copy source code
COPY backend/ .

EXPOSE 2400

# Shell form to avoid Node.js entrypoint issues
CMD pnpm run start:dev
