COMPOSE = docker compose -f docker/docker-compose.dev.yml
BACKEND = $(COMPOSE) exec baobab-backend

ollama-sh: 
	docker compose -f docker/docker-compose.dev.yml exec -it baobab-ollama bash

backend-sh:
	docker compose -f docker/docker-compose.dev.yml exec -it baobab-backend sh

frontend:
	docker compose -f docker/docker-compose.dev.yml exec -it baobab-frontend bash

frontend-logs:
	docker compose -f docker/docker-compose.dev.yml logs -f baobab-frontend

backend-logs:
	docker compose -f docker/docker-compose.dev.yml logs -f baobab-backend

backend-restart:
	docker compose -f docker/docker-compose.dev.yml up -d --build --no-deps baobab-backend

db-generate:
	$(BACKEND) pnpm run generate

db-migrate:
	$(BACKEND) pnpm run migrate

db-push:
	$(BACKEND) pnpm run db:push
	