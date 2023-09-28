/** @format */

import fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import envConfig from './lib/env.config';
import corsConfig from './config/cors.config';
import loggerConfig from './config/logger.config';
import compressConfig from './config/compress.config';
import prismaPlugin from './plugins/prisma.plugin';
import helmetConfig from './config/helmet.config';
import { swaggerConfig } from './config/swagger.config';

import categoriesRoutes from './routes/categories.routes';
import { messageSchema, paramIdSchema } from './schema/common.schema';

const main = async () => {
  const app = fastify({
    logger: loggerConfig
  });

  // Now we set up our app, plugins and such
  await app.register(fastifyEnv, envConfig);
  await app.register(fastifyCors, corsConfig);
  await app.register(fastifyCompress, compressConfig);
  await app.register(fastifyHelmet, helmetConfig);
  await app.register(prismaPlugin);

  // Json Schemas
  app.addSchema(paramIdSchema);
  app.addSchema(messageSchema);

  // Swagger Docs
  // @ts-ignore
  if (app.config.ENABLE_SWAGGER) {
    await app.register(fastifySwagger, swaggerConfig);
    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs'
    });
  }

  // npx autocannon -c 1000 -d 5 -p 10 "http://127.0.0.1:5000/api/v1/categories?size=10&page=1"

  // API Endpoint routes
  await app.register(
    async api => {
      api.register(categoriesRoutes, { prefix: '/categories' });
      // api.register(productsRoutes, { prefix: '/products' });
    },
    { prefix: '/api/v1' }
  );

  return app;
};

export { main };
