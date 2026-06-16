ollama-sh: 
	docker compose -f docker/docker-compose.dev.yml exec -it baobab-ollama bash

backend-sh:
	docker compose -f docker/docker-compose.dev.yml exec -it baobab-backend sh

frontend:
	docker compose -f docker/docker-compose.dev.yml exec -it baobab-frontend bash

backend-restart:
	docker compose -f docker/docker-compose.dev.yml up -d --build --no-deps baobab-backend