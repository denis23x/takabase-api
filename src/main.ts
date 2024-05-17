/** @format */

import fastify, { FastifyReply, FastifyRequest, FastifyInstance, HookHandlerDoneFunction } from 'fastify';
import { ContentTypeParserDoneFunction } from 'fastify/types/content-type-parser';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';

// CONFIGURATIONS

import { corsConfig } from './config/cors.config';
import { loggerConfig } from './config/logger.config';
import { compressConfig } from './config/compress.config';
import { helmetConfig } from './config/helmet.config';
import { swaggerConfig } from './config/swagger.config';
import { jwtConfig } from './config/jwt.config';
import { rateLimitConfig } from './config/rate-limit.config';

// PLUGINS

import authPlugin from './plugins/auth.plugin';
import firebasePlugin from './plugins/firebase.plugin';
import firestorePlugin from './plugins/firestore.plugin';
import helperPlugin from './plugins/helper.plugin';
import jwtPlugin from './plugins/jwt.plugin';
import markdownPlugin from './plugins/markdown.plugin';
import prismaPlugin from './plugins/prisma.plugin';
import storagePlugin from './plugins/storage.plugin';

// ROUTES

import authorizationRoutes from './routes/authorization';
import categoriesRoutes from './routes/categories';
import postsRoutes from './routes/posts';
import usersRoutes from './routes/users';
import testsRoutes from './routes/tests';

// SCHEMAS

import { bodyCategoryUpsertSchema } from './schema/crud/body/body-category-upsert.schema';
import { bodyUserUpsertSchema } from './schema/crud/body/body-user-upsert.schema';
import { bodyPostUpsertSchema } from './schema/crud/body/body-post-upsert.schema';
import { paramsIdSchema } from './schema/crud/params/params-id.schema';
import { querystringFirebaseUidSchema } from './schema/crud/querystring/querystring-firebase-uid.schema';
import { querystringScopeSchema } from './schema/crud/querystring/querystring-scope.schema';
import { querystringSearchSchema } from './schema/crud/querystring/querystring-search.schema';
import { querystringSearchCategorySchema } from './schema/crud/querystring/querystring-search-category.schema';
import { querystringSearchPostSchema } from './schema/crud/querystring/querystring-search-post.schema';
import { querystringSearchUserSchema } from './schema/crud/querystring/querystring-search-user.schema';
import { querystringSearchUserNameSchema } from './schema/crud/querystring/querystring-search-user-name.schema';
import { responseErrorSchema } from './schema/crud/response/response-error.schema';
import { categorySchema } from './schema/category.schema';
import { postSchema } from './schema/post.schema';
import { userSchema } from './schema/user.schema';

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

  // PLUGINS HANDMADE

  await fastifyInstance.register(helperPlugin);
  await fastifyInstance.register(jwtPlugin);
  await fastifyInstance.register(markdownPlugin);
  await fastifyInstance.register(prismaPlugin);

  // JSON SCHEMA CRUD

  fastifyInstance.addSchema(bodyCategoryUpsertSchema);
  fastifyInstance.addSchema(bodyPostUpsertSchema);
  fastifyInstance.addSchema(bodyUserUpsertSchema);
  fastifyInstance.addSchema(paramsIdSchema);
  fastifyInstance.addSchema(querystringFirebaseUidSchema);
  fastifyInstance.addSchema(querystringScopeSchema);
  fastifyInstance.addSchema(querystringSearchSchema);
  fastifyInstance.addSchema(querystringSearchCategorySchema);
  fastifyInstance.addSchema(querystringSearchPostSchema);
  fastifyInstance.addSchema(querystringSearchUserSchema);
  fastifyInstance.addSchema(querystringSearchUserNameSchema);
  fastifyInstance.addSchema(responseErrorSchema);

  // JSON SCHEMA MODELS

  fastifyInstance.addSchema(categorySchema);
  fastifyInstance.addSchema(postSchema);
  fastifyInstance.addSchema(userSchema);

  // LOCALHOST

  if (process.env.APP_NODE_ENV === 'localhost') {
    // prettier-ignore
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

  if (process.env.APP_NODE_ENV !== 'localhost') {
    // prettier-ignore
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
