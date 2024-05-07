/** @format */

import fastify, { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';

import { corsConfig } from './config/cors.config';
import { loggerConfig } from './config/logger.config';
import { compressConfig } from './config/compress.config';
import { helmetConfig } from './config/helmet.config';
import { swaggerConfig } from './config/swagger.config';
import { jwtConfig } from './config/jwt.config';
import { rateLimitConfig } from './config/rate-limit.config';

import authPlugin from './plugins/auth.plugin';
import firebasePlugin from './plugins/firebase.plugin';
import firestorePlugin from './plugins/firestore.plugin';
import helperPlugin from './plugins/helper.plugin';
import jwtPlugin from './plugins/jwt.plugin';
import markdownPlugin from './plugins/markdown.plugin';
import prismaPlugin from './plugins/prisma.plugin';
import storagePlugin from './plugins/storage.plugin';

import authorizationRoutes from './routes/authorization';
import categoriesRoutes from './routes/categories';
import postsRoutes from './routes/posts';
import usersRoutes from './routes/users';
import testsRoutes from './routes/tests';

import { paramsIdSchema } from './schema/crud/params/params-id.schema';
import { querystringScopeSchema } from './schema/crud/querystring/querystring-scope.schema';
import { querystringSearchSchema } from './schema/crud/querystring/querystring-search.schema';
import { responseErrorSchema } from './schema/crud/response/response-error.schema';

import { categorySchema } from './schema/category.schema';
import { postSchema } from './schema/post.schema';
import { userSchema } from './schema/user.schema';

import { FastifyInstance } from 'fastify/types/instance';
import { ContentTypeParserDoneFunction } from 'fastify/types/content-type-parser';

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

  await fastifyInstance.register(fastifyCors, corsConfig);
  await fastifyInstance.register(fastifyCompress, compressConfig);
  await fastifyInstance.register(fastifyHelmet, helmetConfig);
  await fastifyInstance.register(fastifyJwt, jwtConfig);
  await fastifyInstance.register(fastifyRateLimit, rateLimitConfig);

  // FIREBASE

  fastifyInstance.register(firebasePlugin).after(async () => {
    await fastifyInstance.register(authPlugin);
    await fastifyInstance.register(firestorePlugin);
    await fastifyInstance.register(storagePlugin);
  });

  await fastifyInstance.register(helperPlugin);
  await fastifyInstance.register(jwtPlugin);
  await fastifyInstance.register(markdownPlugin);
  await fastifyInstance.register(prismaPlugin);

  // JSON SCHEMA CRUD

  fastifyInstance.addSchema(paramsIdSchema);
  fastifyInstance.addSchema(querystringScopeSchema);
  fastifyInstance.addSchema(querystringSearchSchema);
  fastifyInstance.addSchema(responseErrorSchema);

  // JSON SCHEMA MODELS

  fastifyInstance.addSchema(categorySchema);
  fastifyInstance.addSchema(postSchema);
  fastifyInstance.addSchema(userSchema);

  // LOCALHOST
  // prettier-ignore
  if (process.env.NODE_ENV === 'localhost') {
    fastifyInstance.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
      setTimeout(() => {
        done();
      }, 1000);
    });

    // SWAGGER

    await fastifyInstance.register(fastifySwagger, swaggerConfig);
    await fastifyInstance.register(fastifySwaggerUi, {
      routePrefix: '/docs'
    });
  }

  // GCP ISSUE
  // prettier-ignore
  if (process.env.NODE_ENV !== 'localhost') {
    fastifyInstance.addContentTypeParser('application/json', {}, (request: FastifyRequest, body: any, done: ContentTypeParserDoneFunction) => {
      done(null, body.body);
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
      api.register(testsRoutes, {
        prefix: '/tests/'
      });
    },
    {
      prefix: '/api/v1'
    }
  );

  return fastifyInstance;
};
