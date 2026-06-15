FROM node:26-alpine

WORKDIR /app

# Copy dependency files
COPY frontend/package.json frontend/package-lock.json* ./

RUN npm install

# Copy source code
COPY frontend/ .

EXPOSE 3000

# Shell form to avoid Node.js entrypoint issues
CMD npm run start -- --host 0.0.0.0 --port 3000
