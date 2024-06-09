.PHONY: migrate seed

migrate:
	dotenv -e .env.takabase-local -- npx prisma migrate dev
seed:
	dotenv -e .env.takabase-local -- npx prisma db seed
