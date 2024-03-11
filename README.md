# Takabase API

Setup

- `npm install`
- Setup **Prettier**
- Setup **ESLint**

Processes

> Don't use NPM use docker instead

Builds

- `build:prod` build production server bundle

Makefile (using Docker)

- `make up` swagger http://localhost:4400/docs
- `make down` stop docker container
- `make exec` go into running container

Prisma

- `prisma generate` generates prisma client
- `prisma studio` runs prisma studio http://localhost:5555
- `prisma migrate` runs prisma migrations
- `prisma seed` clear and seed database with fake data

Some configurations

- `.env.example` app .env (also `src/config/env.config.ts`)
- `ecosystem.config.js` process handler (production docker)
- `firebase.json` dev deploy config

Contact https://t.me/denis23x
