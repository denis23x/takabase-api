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
import fastifyStatic from '@fastify/static';
import fastifyEtag from '@fastify/etag';

// CONFIGURATIONS

import { corsConfig } from './config/cors.config';
import { loggerConfig } from './config/logger.config';
import { compressConfig } from './config/compress.config';
import { helmetConfig } from './config/helmet.config';
import { swaggerConfig } from './config/swagger.config';
import { jwtConfig } from './config/jwt.config';
import { rateLimitConfig } from './config/rate-limit.config';
import { staticConfig } from './config/static.config';

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
import { postSchema } from './schema/models/post.schema';
import { userSchema } from './schema/models/user.schema';
import { responseErrorSchema } from './schema/crud/response/response-error.schema';
import { partsCategoryDescriptionSchema } from './schema/parts/category/parts-category-description.schema';
import { partsCategoryNameSchema } from './schema/parts/category/parts-category-name.schema';
import { partsFirebaseUidSchema } from './schema/parts/parts-firebase-uid.schema';
import { partsFirebaseUrlStorageSchema } from './schema/parts/parts-firebase-url-storage.schema';
import { partsIdSchema } from './schema/parts/parts-id.schema';
import { partsPostDescriptionSchema } from './schema/parts/post/parts-post-description.schema';
import { partsPostMarkdownSchema } from './schema/parts/post/parts-post-markdown.schema';
import { partsPostNameSchema } from './schema/parts/post/parts-post-name.schema';
import { partsSearchSchema } from './schema/parts/parts-search.schema';
import { partsPageSchema } from './schema/parts/page/parts-page.schema';
import { partsPageOrderBySchema } from './schema/parts/page/parts-page-order-by.schema';
import { partsPageSizeSchema } from './schema/parts/page/parts-page-size.schema';
import { partsScopeSchema } from './schema/parts/parts-scope.schema';
import { partsUserDescriptionSchema } from './schema/parts/user/parts-user-description.schema';
import { partsUserEmailSchema } from './schema/parts/user/parts-user-email.schema';
import { partsUserNameSchema } from './schema/parts/user/parts-user-name.schema';
import { partsUserPasswordSchema } from './schema/parts/user/parts-user-password.schema';
import { partsUserTermsSchema } from './schema/parts/user/parts-user-terms.schema';

export const main = async (): Promise<FastifyInstance> => {
  const fastifyInstance: FastifyInstance = fastify({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
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
  await fastifyInstance.register(fastifyStatic, staticConfig);
  await fastifyInstance.register(fastifyEtag);

  // INDEX

  fastifyInstance.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).type('text/html').sendFile('index.html');
  });

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
  fastifyInstance.addSchema(postSchema);
  fastifyInstance.addSchema(userSchema);
  fastifyInstance.addSchema(responseErrorSchema);
  fastifyInstance.addSchema(partsCategoryDescriptionSchema);
  fastifyInstance.addSchema(partsCategoryNameSchema);
  fastifyInstance.addSchema(partsFirebaseUidSchema);
  fastifyInstance.addSchema(partsFirebaseUrlStorageSchema);
  fastifyInstance.addSchema(partsIdSchema);
  fastifyInstance.addSchema(partsPageSchema);
  fastifyInstance.addSchema(partsPageOrderBySchema);
  fastifyInstance.addSchema(partsPageSizeSchema);
  fastifyInstance.addSchema(partsPostDescriptionSchema);
  fastifyInstance.addSchema(partsPostMarkdownSchema);
  fastifyInstance.addSchema(partsPostNameSchema);
  fastifyInstance.addSchema(partsSearchSchema);
  fastifyInstance.addSchema(partsScopeSchema);
  fastifyInstance.addSchema(partsUserDescriptionSchema);
  fastifyInstance.addSchema(partsUserEmailSchema);
  fastifyInstance.addSchema(partsUserNameSchema);
  fastifyInstance.addSchema(partsUserPasswordSchema);
  fastifyInstance.addSchema(partsUserTermsSchema);

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
