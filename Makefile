.PHONY: up down build rm exec

up:
	docker compose up --remove-orphans
down:
	docker compose down
build:
	docker build -t app-fastify-api:latest .
rm:
	docker rm -f app-fastify-api app-fastify-mysql
exec:
	docker exec -it app-fastify-api sh
