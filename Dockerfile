FROM node:18-alpine As development

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
COPY --chown=node:node .npmrc ./

RUN npm ci

COPY --chown=node:node . .

USER node

FROM node:18-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
COPY --chown=node:node .npmrc ./
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .

ENV NODE_ENV=production

RUN npx prisma generate
RUN npm run build
RUN npm ci --omit=dev
RUN npm cache clean --force

USER node

FROM node:18-alpine As production

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

CMD [ "node", "dist/main.js" ]
