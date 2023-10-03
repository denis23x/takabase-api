.PHONY: up down build rm exec

up:
	docker-compose up --remove-orphans
down:
	docker compose down
build:
	docker build -t draft-fastify:latest .
rm:
	docker rm -f app-api app-mysql
exec:
	docker exec -it app-fastify-api sh
