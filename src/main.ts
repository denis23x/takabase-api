/** @format */

import fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyJwt from '@fastify/jwt';

import { envConfig } from './config/env.config';
import { corsConfig } from './config/cors.config';
import { loggerConfig } from './config/logger.config';
import { compressConfig } from './config/compress.config';
import { helmetConfig } from './config/helmet.config';
import { cookieConfig } from './config/cookie.config';
import { staticConfig } from './config/static.config';
import { swaggerConfig } from './config/swagger.config';
import { jwtConfig } from './config/jwt.config';

import jwtPlugin from './plugins/jwt.plugin';
import prismaPlugin from './plugins/prisma.plugin';

import authorizationRoutes from './routes/authorization.routes';
import categoriesRoutes from './routes/categories.routes';
import postsRoutes from './routes/posts.routes';
import usersRoutes from './routes/users.routes';

import {
  requestParameterIdSchema,
  requestQueryParameterSchema,
  requestQueryParameterScopeSchema,
  responseErrorSchema
} from './schema/requests.schema';

import { categorySchema } from './schema/category.schema';
import { postSchema } from './schema/post.schema';
import { userSchema } from './schema/user.schema';

import { FastifyInstance } from 'fastify/types/instance';

export const main = async (): Promise<FastifyInstance> => {
  const fastifyInstance: FastifyInstance = fastify({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    ajv: {
      customOptions: {
        keywords: ['collectionFormat', 'example']
      }
    },
    logger: loggerConfig
  });

  // PLUGINS

  await fastifyInstance.register(fastifyEnv, envConfig);
  await fastifyInstance.register(fastifyCors, corsConfig);
  await fastifyInstance.register(fastifyCompress, compressConfig);
  await fastifyInstance.register(fastifyHelmet, helmetConfig);
  await fastifyInstance.register(fastifyCookie, cookieConfig);
  await fastifyInstance.register(fastifyStatic, staticConfig);
  await fastifyInstance.register(fastifyJwt, jwtConfig);

  await fastifyInstance.register(jwtPlugin);
  await fastifyInstance.register(prismaPlugin);

  // JSON SCHEMAS

  /** https://json-schema.org/understanding-json-schema/structuring#retrieval-uri */

  fastifyInstance.addSchema(requestParameterIdSchema);
  fastifyInstance.addSchema(requestQueryParameterSchema);
  fastifyInstance.addSchema(requestQueryParameterScopeSchema);
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
      api.register(authorizationRoutes, {
        prefix: '/authorization/'
      });
      api.register(categoriesRoutes, {
        prefix: '/categories/'
      });
      api.register(postsRoutes, {
        prefix: '/posts/'
      });
      api.register(usersRoutes, {
        prefix: '/users/'
      });
    },
    {
      prefix: '/api/v1'
    }
  );

  return fastifyInstance;
};
