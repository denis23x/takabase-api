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
import appCheckPlugin from './plugins/app-check.plugin';
import authPlugin from './plugins/auth.plugin';
import dayjsPlugin from './plugins/dayjs.plugin';
import firebasePlugin from './plugins/firebase.plugin';
import firestorePlugin from './plugins/firestore.plugin';
import helperPlugin from './plugins/helper.plugin';
import lavinMQPlugin from './plugins/lavinmq.plugin';
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
import postsBookmarkRoutes from './routes/posts-bookmark';
import postsPasswordRoutes from './routes/posts-password';
import postsPrivateRoutes from './routes/posts-private';
import sitemapRoutes from './routes/sitemaps';
import testsRoutes from './routes/tests';
import usersRoutes from './routes/users';
import utilitiesRoutes from './routes/utilities';

// SCHEMAS

import { categorySchema } from './schema/models/category.schema';
import { insightsSchema } from './schema/models/insights.schema';
import { metadataSchema } from './schema/models/metadata.schema';
import { postSchema } from './schema/models/post.schema';
import { postBookmarkSchema } from './schema/models/post-bookmark.schema';
import { postPasswordSchema } from './schema/models/post-password.schema';
import { postPrivateSchema } from './schema/models/post-private.schema';
import { userSchema } from './schema/models/user.schema';
import { responseErrorSchema } from './schema/crud/response/response-error.schema';
import { partsAlgoliaAddRecordsSchema } from './schema/parts/algolia/parts-algolia-add-records.schema';
import { partsAlgoliaResponseSchema } from './schema/parts/algolia/parts-algolia-response.schema';
import { partsAppCheckResponseSchema } from './schema/parts/authorization/parts-app-check-response.schema';
import { partsCategoryDescriptionSchema } from './schema/parts/category/parts-category-description.schema';
import { partsCategoryNameSchema } from './schema/parts/category/parts-category-name.schema';
import { partsInsightsUnitSchema } from './schema/parts/insights/parts-insights-unit.schema';
import { partsInsightsValueSchema } from './schema/parts/insights/parts-insights-value.schema';
import { partsPageSchema } from './schema/parts/page/parts-page.schema';
import { partsPageQuerySchema } from './schema/parts/page/parts-page-query.schema';
import { partsPageSizeSchema } from './schema/parts/page/parts-page-size.schema';
import { partsPostDescriptionSchema } from './schema/parts/post/parts-post-description.schema';
import { partsPostMarkdownSchema } from './schema/parts/post/parts-post-markdown.schema';
import { partsPostNameSchema } from './schema/parts/post/parts-post-name.schema';
import { partsPostBookmarkAttachSchema } from './schema/parts/post-bookmark/parts-post-bookmark-attach.schema';
import { partsSitemapDownloadSchema } from './schema/parts/sitemap/parts-sitemap-download.schema';
import { partsUserDescriptionSchema } from './schema/parts/user/parts-user-description.schema';
import { partsUserEmailSchema } from './schema/parts/user/parts-user-email.schema';
import { partsUsernameSchema } from './schema/parts/user/parts-user-name.schema';
import { partsUserTermsSchema } from './schema/parts/user/parts-user-terms.schema';
import { partsFirebaseUidSchema } from './schema/parts/parts-firebase-uid.schema';
import { partsIdSchema } from './schema/parts/parts-id.schema';
import { partsImageSchema } from './schema/parts/parts-image.schema';
import { partsInsightsSchema } from './schema/parts/parts-insights.schema';
import { partsPasswordSchema } from './schema/parts/parts-password.schema';

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
  await fastifyInstance.register(fastifyRateLimit, rateLimitConfig);
  await fastifyInstance.register(fastifyStatic, staticConfig);
  await fastifyInstance.register(fastifyEtag);

  // FIREBASE

  fastifyInstance.register(firebasePlugin).after(async () => {
    await fastifyInstance.register(authPlugin);
    await fastifyInstance.register(firestorePlugin);
    await fastifyInstance.register(storagePlugin);
    await fastifyInstance.register(remoteConfigPlugin);
  });

  // NOINDEX

  fastifyInstance.addHook('onSend', async (_, reply: FastifyReply, payload) => {
    reply.header('X-Robots-Tag', 'noindex');

    return payload;
  });

  // PLUGINS HANDMADE

  await fastifyInstance.register(algoliaPlugin);
  await fastifyInstance.register(appCheckPlugin);
  await fastifyInstance.register(dayjsPlugin);
  await fastifyInstance.register(helperPlugin);
  await fastifyInstance.register(lavinMQPlugin);
  await fastifyInstance.register(markdownPlugin);
  await fastifyInstance.register(prismaPlugin);
  await fastifyInstance.register(sitemapPlugin);

  // JSON SCHEMA CRUD

  fastifyInstance.addSchema(categorySchema);
  fastifyInstance.addSchema(insightsSchema);
  fastifyInstance.addSchema(metadataSchema);
  fastifyInstance.addSchema(postSchema);
  fastifyInstance.addSchema(postBookmarkSchema);
  fastifyInstance.addSchema(postPasswordSchema);
  fastifyInstance.addSchema(postPrivateSchema);
  fastifyInstance.addSchema(userSchema);
  fastifyInstance.addSchema(responseErrorSchema);
  fastifyInstance.addSchema(partsAlgoliaAddRecordsSchema);
  fastifyInstance.addSchema(partsAlgoliaResponseSchema);
  fastifyInstance.addSchema(partsAppCheckResponseSchema);
  fastifyInstance.addSchema(partsCategoryDescriptionSchema);
  fastifyInstance.addSchema(partsCategoryNameSchema);
  fastifyInstance.addSchema(partsInsightsUnitSchema);
  fastifyInstance.addSchema(partsInsightsValueSchema);
  fastifyInstance.addSchema(partsPageSchema);
  fastifyInstance.addSchema(partsPageQuerySchema);
  fastifyInstance.addSchema(partsPageSizeSchema);
  fastifyInstance.addSchema(partsPostDescriptionSchema);
  fastifyInstance.addSchema(partsPostMarkdownSchema);
  fastifyInstance.addSchema(partsPostNameSchema);
  fastifyInstance.addSchema(partsPostBookmarkAttachSchema);
  fastifyInstance.addSchema(partsSitemapDownloadSchema);
  fastifyInstance.addSchema(partsUserDescriptionSchema);
  fastifyInstance.addSchema(partsUserEmailSchema);
  fastifyInstance.addSchema(partsUsernameSchema);
  fastifyInstance.addSchema(partsUserTermsSchema);
  fastifyInstance.addSchema(partsFirebaseUidSchema);
  fastifyInstance.addSchema(partsIdSchema);
  fastifyInstance.addSchema(partsImageSchema);
  fastifyInstance.addSchema(partsInsightsSchema);
  fastifyInstance.addSchema(partsPasswordSchema);

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
      api.register(postsBookmarkRoutes, {
        prefix: '/posts-bookmark/'
      });
      api.register(postsPasswordRoutes, {
        prefix: '/posts-password/'
      });
      api.register(postsPrivateRoutes, {
        prefix: '/posts-private/'
      });
      api.register(sitemapRoutes, {
        prefix: '/sitemaps/'
      });
      api.register(testsRoutes, {
        prefix: '/tests/'
      });
      api.register(usersRoutes, {
        prefix: '/users/'
      });
      api.register(utilitiesRoutes, {
        prefix: '/utilities/'
      });
    },
    {
      prefix: '/api/v1'
    }
  );

  return fastifyInstance;
};
