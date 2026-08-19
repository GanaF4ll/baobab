# ==============================================================================
# Baobab Makefile
# ==============================================================================

COMPOSE_DEV = docker compose -f docker/docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker/docker-compose.yml

BACKEND_DEV = $(COMPOSE_DEV) exec baobab-backend
BACKEND_PROD = $(COMPOSE_PROD) exec baobab-backend

.PHONY: dev-up dev-down dev-logs prod-up prod-down prod-build prod-logs prod-restart db-generate db-migrate db-seed check lint test

# ------------------------------------------------------------------------------
# Development
# ------------------------------------------------------------------------------
dev-up:
	$(COMPOSE_DEV) up --build

dev-down:
	$(COMPOSE_DEV) down

dev-reset:
	$(COMPOSE_DEV) down --volumes --remove-orphans

dev-logs:
	$(COMPOSE_DEV) logs -f

# ------------------------------------------------------------------------------
# Production
# ------------------------------------------------------------------------------
prod-build:
	$(COMPOSE_PROD) build

prod-up:
	$(COMPOSE_PROD) up -d --build

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f

prod-restart:
	$(COMPOSE_PROD) restart

# ------------------------------------------------------------------------------
# Database & Migrations
# ------------------------------------------------------------------------------
db-generate:
	$(BACKEND_DEV) pnpm run generate

db-migrate:
	$(BACKEND_DEV) pnpm run migrate

db-seed:
	$(BACKEND_DEV) pnpm run seed

db-push:
	$(BACKEND_DEV) pnpm run db:push

# ------------------------------------------------------------------------------
# Quality & Tests
# ------------------------------------------------------------------------------
lint:
	pnpm run lint

format:
	pnpm run format

check:
	pnpm run check

test-backend:
	pnpm --filter backend test

test-frontend:
	pnpm --filter frontend test

test: test-backend test-frontend

# ------------------------------------------------------------------------------
# Shell access
# ------------------------------------------------------------------------------
ollama-sh:
	$(COMPOSE_DEV) exec -it baobab-ollama bash

backend-sh:
	$(COMPOSE_DEV) exec -it baobab-backend sh

frontend-sh:
	$(COMPOSE_DEV) exec -it baobab-frontend bash