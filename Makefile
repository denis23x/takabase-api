.PHONY: reset migrate seed

reset:
	dotenv -e .env.takabase-local -- npx prisma migrate reset
migrate:
	dotenv -e .env.takabase-local -- npx prisma migrate dev
seed:
	dotenv -e .env.takabase-local -- npx prisma db seed
