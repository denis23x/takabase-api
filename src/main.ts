/** @format */

import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fastifyEtag from '@fastify/etag';
import type { ContentTypeParserDoneFunction } from 'fastify/types/content-type-parser';
import type { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';

// CONFIGURATIONS

import { corsConfig } from './config/cors.config';
import { loggerConfig } from './config/logger.config';
import { compressConfig } from './config/compress.config';
import { helmetConfig } from './config/helmet.config';
import { swaggerConfig } from './config/swagger.config';
import { rateLimitConfig } from './config/rate-limit.config';
import { staticConfig } from './config/static.config';

// PLUGINS

import algoliaPlugin from './plugins/algolia.plugin';
import authPlugin from './plugins/auth.plugin';
import dayjsPlugin from './plugins/dayjs.plugin';
import firebasePlugin from './plugins/firebase.plugin';
import firestorePlugin from './plugins/firestore.plugin';
import helperPlugin from './plugins/helper.plugin';
import markdownPlugin from './plugins/markdown.plugin';
import prismaPlugin from './plugins/prisma.plugin';
import remoteConfigPlugin from './plugins/remote-config.plugin';
import sitemapPlugin from './plugins/sitemap.plugin';
import storagePlugin from './plugins/storage.plugin';

// ROUTES

import algoliaRoutes from './routes/algolia';
import authorizationRoutes from './routes/authorization';
import categoriesRoutes from './routes/categories';
import insightsRoutes from './routes/insights';
import postsRoutes from './routes/posts';
import postsPasswordRoutes from './routes/posts-password';
import postsPrivateRoutes from './routes/posts-private';
import sitemapRoutes from './routes/sitemap';
import testsRoutes from './routes/tests';
import usersRoutes from './routes/users';

// SCHEMAS

import { categorySchema } from './schema/models/category.schema';
import { insightSchema } from './schema/models/insight.schema';
import { postSchema } from './schema/models/post.schema';
import { postPasswordSchema } from './schema/models/post-password.schema';
import { postPrivateSchema } from './schema/models/post-private.schema';
import { userSchema } from './schema/models/user.schema';
import { responseErrorSchema } from './schema/crud/response/response-error.schema';
import { partsAlgoliaAddRecordsSchema } from './schema/parts/algolia/parts-algolia-add-records.schema';
import { partsAlgoliaResponseSchema } from './schema/parts/algolia/parts-algolia-response.schema';
import { partsAppCheckResponseSchema } from './schema/parts/authorization/parts-app-check-response.schema';
import { partsCategoryDescriptionSchema } from './schema/parts/category/parts-category-description.schema';
import { partsCategoryNameSchema } from './schema/parts/category/parts-category-name.schema';
import { partsInsightResponseSchema } from './schema/parts/insight/parts-insight-response.schema';
import { partsPageSchema } from './schema/parts/page/parts-page.schema';
import { partsPageQuerySchema } from './schema/parts/page/parts-page-query.schema';
import { partsPageSizeSchema } from './schema/parts/page/parts-page-size.schema';
import { partsPostDescriptionSchema } from './schema/parts/post/parts-post-description.schema';
import { partsPostMarkdownSchema } from './schema/parts/post/parts-post-markdown.schema';
import { partsPostNameSchema } from './schema/parts/post/parts-post-name.schema';
import { partsUserDescriptionSchema } from './schema/parts/user/parts-user-description.schema';
import { partsUserEmailSchema } from './schema/parts/user/parts-user-email.schema';
import { partsUsernameSchema } from './schema/parts/user/parts-user-name.schema';
import { partsUserTermsSchema } from './schema/parts/user/parts-user-terms.schema';
import { partsFirebaseUidSchema } from './schema/parts/parts-firebase-uid.schema';
import { partsFirebaseUrlStorageSchema } from './schema/parts/parts-firebase-url-storage.schema';
import { partsIdSchema } from './schema/parts/parts-id.schema';
import { partsPasswordSchema } from './schema/parts/parts-password.schema';
import { partsScopeSchema } from './schema/parts/parts-scope.schema';
import { partsSitemapSchema } from './schema/parts/sitemap/parts-sitemap.schema';

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
    await fastifyInstance.register(remoteConfigPlugin);
  });

  // PLUGINS HANDMADE

  await fastifyInstance.register(algoliaPlugin);
  await fastifyInstance.register(dayjsPlugin);
  await fastifyInstance.register(helperPlugin);
  await fastifyInstance.register(markdownPlugin);
  await fastifyInstance.register(prismaPlugin);
  await fastifyInstance.register(sitemapPlugin);

  // JSON SCHEMA CRUD

  fastifyInstance.addSchema(categorySchema);
  fastifyInstance.addSchema(insightSchema);
  fastifyInstance.addSchema(postSchema);
  fastifyInstance.addSchema(postPasswordSchema);
  fastifyInstance.addSchema(postPrivateSchema);
  fastifyInstance.addSchema(userSchema);
  fastifyInstance.addSchema(responseErrorSchema);
  fastifyInstance.addSchema(partsAlgoliaAddRecordsSchema);
  fastifyInstance.addSchema(partsAlgoliaResponseSchema);
  fastifyInstance.addSchema(partsAppCheckResponseSchema);
  fastifyInstance.addSchema(partsCategoryDescriptionSchema);
  fastifyInstance.addSchema(partsCategoryNameSchema);
  fastifyInstance.addSchema(partsInsightResponseSchema);
  fastifyInstance.addSchema(partsPageSchema);
  fastifyInstance.addSchema(partsPageQuerySchema);
  fastifyInstance.addSchema(partsPageSizeSchema);
  fastifyInstance.addSchema(partsPostDescriptionSchema);
  fastifyInstance.addSchema(partsPostMarkdownSchema);
  fastifyInstance.addSchema(partsPostNameSchema);
  fastifyInstance.addSchema(partsUserDescriptionSchema);
  fastifyInstance.addSchema(partsUserEmailSchema);
  fastifyInstance.addSchema(partsUsernameSchema);
  fastifyInstance.addSchema(partsUserTermsSchema);
  fastifyInstance.addSchema(partsFirebaseUidSchema);
  fastifyInstance.addSchema(partsFirebaseUrlStorageSchema);
  fastifyInstance.addSchema(partsIdSchema);
  fastifyInstance.addSchema(partsPasswordSchema);
  fastifyInstance.addSchema(partsScopeSchema);
  fastifyInstance.addSchema(partsSitemapSchema);

  // LOCALHOST

  if (process.env.APP_NODE_ENV === 'localhost') {
    await fastifyInstance.register(fastifySwagger, swaggerConfig);
    await fastifyInstance.register(fastifySwaggerUi, {
      routePrefix: '/docs'
    });
  }

  // GCP ISSUE

  fastifyInstance.removeAllContentTypeParsers();

  // prettier-ignore
  fastifyInstance.addContentTypeParser('application/json', {}, (request: FastifyRequest, body: any, done: ContentTypeParserDoneFunction) => {
    done(null, body.body);
  });

  // API

  await fastifyInstance.register(
    async (api: FastifyInstance): Promise<void> => {
      api.register(algoliaRoutes, {
        prefix: '/algolia/'
      });
      api.register(authorizationRoutes, {
        prefix: '/authorization/'
      });
      api.register(categoriesRoutes, {
        prefix: '/categories/'
      });
      api.register(insightsRoutes, {
        prefix: '/insights/'
      });
      api.register(postsRoutes, {
        prefix: '/posts/'
      });
      api.register(postsPasswordRoutes, {
        prefix: '/posts-password/'
      });
      api.register(postsPrivateRoutes, {
        prefix: '/posts-private/'
      });
      api.register(sitemapRoutes, {
        prefix: '/sitemap/'
      });
      api.register(testsRoutes, {
        prefix: '/tests/'
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
