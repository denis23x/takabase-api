.PHONY: up down exec

up:
	docker compose --env-file .env.takabase-local up --remove-orphans
down:
	docker compose down
exec:
	docker exec -it app-takabase-api sh
