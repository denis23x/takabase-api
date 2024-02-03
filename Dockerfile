FROM node:18-alpine As development

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
COPY --chown=node:node .npmrc ./

ENV NODE_ENV=development

RUN npm i

COPY --chown=node:node . .

RUN npx prisma generate

USER node

#FROM node:18-alpine As build
#
#WORKDIR /usr/src/app
#
#COPY --chown=node:node package*.json ./
#COPY --chown=node:node .npmrc ./
#COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules
#COPY --chown=node:node . .
#
#ENV NODE_ENV=production
#
#RUN npx prisma generate
#
#RUN npm run build
#
#RUN rm -rf ./node_modules
#
#RUN npm ci --omit=dev
#RUN npm cache clean --force
#
#USER node
#
#FROM node:18-alpine As production
#
#RUN npm install pm2 -g
#
#COPY --chown=node:node ecosystem.config.js ./
#COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
#COPY --chown=node:node --from=build /usr/src/app/dist ./dist
#
#CMD ["pm2-runtime", "ecosystem.config.js"]
