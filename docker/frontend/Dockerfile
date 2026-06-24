FROM node:26-alpine

WORKDIR /app

# Copy all source first, then install so lockfile is always current
COPY frontend/ .

# Install dependencies (node_modules excluded via .dockerignore)
RUN npm ci

EXPOSE 3000

# Shell form to avoid Node.js entrypoint issues
CMD npm run start -- --host 0.0.0.0 --port 3000
