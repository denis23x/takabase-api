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

import { categorySchema } from './schema/models/category.schema';
import { categoryUpsertSchema } from './schema/models/category-upsert.schema';
import { postSchema } from './schema/models/post.schema';
import { postUpsertSchema } from './schema/models/post-upsert.schema';
import { userCreateSchema } from './schema/models/user-create.schema';
import { userSchema } from './schema/models/user.schema';
import { userUpdateSchema } from './schema/models/user-update.schema';
import { responseErrorSchema } from './schema/crud/response/response-error.schema';
import { partsFirebaseUidSchema } from './schema/parts/parts-firebase-uid.schema';
import { partsIdSchema } from './schema/parts/parts-id.schema';
import { partsSearchSchema } from './schema/parts/parts-search.schema';
import { partsSearchPaginationSchema } from './schema/parts/parts-search-pagination.schema';
import { partsSearchScopeSchema } from './schema/parts/parts-search-scope.schema';
import { partsSearchUserNameSchema } from './schema/parts/parts-search-user-name.schema';
import { partsUserEmailSchema } from './schema/parts/parts-user-email.schema';
import { partsUserNameSchema } from './schema/parts/parts-user-name.schema';
import { partsUserPasswordSchema } from './schema/parts/parts-user-password.schema';

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

  fastifyInstance.addSchema(categorySchema);
  fastifyInstance.addSchema(categoryUpsertSchema);
  fastifyInstance.addSchema(postSchema);
  fastifyInstance.addSchema(postUpsertSchema);
  fastifyInstance.addSchema(userCreateSchema);
  fastifyInstance.addSchema(userSchema);
  fastifyInstance.addSchema(userUpdateSchema);
  fastifyInstance.addSchema(responseErrorSchema);
  fastifyInstance.addSchema(partsFirebaseUidSchema);
  fastifyInstance.addSchema(partsIdSchema);
  fastifyInstance.addSchema(partsSearchSchema);
  fastifyInstance.addSchema(partsSearchPaginationSchema);
  fastifyInstance.addSchema(partsSearchScopeSchema);
  fastifyInstance.addSchema(partsSearchUserNameSchema);
  fastifyInstance.addSchema(partsUserEmailSchema);
  fastifyInstance.addSchema(partsUserNameSchema);
  fastifyInstance.addSchema(partsUserPasswordSchema);

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
