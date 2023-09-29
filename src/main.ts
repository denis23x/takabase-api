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
import postsRoutes from './routes/posts.routes';
import usersRoutes from './routes/users.routes';

import { requestParameterIdSchema, responseErrorSchema } from './schema/common.schema';

import { categorySchema } from './schema/category.schema';
import { postSchema } from './schema/post.schema';
import { userSchema } from './schema/user.schema';

import { FastifyInstance } from 'fastify/types/instance';

export const main = async (): Promise<FastifyInstance> => {
  const fastifyInstance: FastifyInstance = fastify({
    ajv: {
      customOptions: {
        keywords: ['collectionFormat']
      }
    },
    logger: loggerConfig
  });

  // PLUGINS

  await fastifyInstance.register(fastifyEnv, envConfig);
  await fastifyInstance.register(fastifyCors, corsConfig);
  await fastifyInstance.register(fastifyCompress, compressConfig);
  await fastifyInstance.register(fastifyHelmet, helmetConfig);
  await fastifyInstance.register(prismaPlugin);

  // JSON SCHEMAS

  fastifyInstance.addSchema(requestParameterIdSchema);
  fastifyInstance.addSchema(responseErrorSchema);
  fastifyInstance.addSchema(categorySchema);
  fastifyInstance.addSchema(postSchema);
  fastifyInstance.addSchema(userSchema);

  // SWAGGER

  if (fastifyInstance.config.ENABLE_SWAGGER) {
    await fastifyInstance.register(fastifySwagger, swaggerConfig);
    await fastifyInstance.register(fastifySwaggerUi, {
      routePrefix: '/docs'
    });
  }

  // API

  await fastifyInstance.register(
    async (api: FastifyInstance): Promise<void> => {
      api.register(categoriesRoutes, {
        prefix: '/categories'
      });
      api.register(postsRoutes, {
        prefix: '/posts'
      });
      api.register(usersRoutes, {
        prefix: '/users'
      });
    },
    {
      prefix: '/api/v1'
    }
  );

  return fastifyInstance;
};
