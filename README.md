# Takabase API

Setup

- `npm install`
- Setup **Prettier**
- Setup **ESLint**
- Setup [husky](https://github.com/typicode/husky)

Processes

> Don't use NPM use docker instead

Builds

- `build:prod` build production server bundle

Makefile (using Docker)

- `make up` swagger http://localhost:8080/docs `GCP Emulator`
- `make down` stop docker container
- `make exec` go into running container

Prisma

- `prisma generate` generates prisma client
- `prisma studio` runs prisma studio http://localhost:5555
- `prisma migrate` runs prisma migrations
- `prisma seed` clear and seed database with fake data

Some configurations

- `.env.example` app `.env.takabase-local`
- `ecosystem.config.js` process handler (production docker)
- `firebase.json` dev deploy config

Contact https://t.me/denis23x
