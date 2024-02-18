.PHONY: up down exec

up:
	docker compose up --remove-orphans
down:
	docker compose down
exec:
	docker exec -it app-takabase-api sh
