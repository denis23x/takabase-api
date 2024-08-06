/** @format */

import type { SwaggerOptions } from '@fastify/swagger';

export const swaggerConfig: SwaggerOptions = {
  openapi: {
    info: {
      title: 'RESTful APIs using Fastify',
      description: '## CRUDs using Swagger, Fastify and Prisma',
      contact: {
        name: 'denis23x',
        url: 'https://takabase.com',
        email: 'damage.23x@gmail.com'
      },
      version: '1.0.0'
    },
    tags: [
      {
        name: 'Authorization',
        description: 'Authorization end-points'
      },
      {
        name: 'Algolia',
        description: 'Algolia search end-points'
      },
      {
        name: 'Categories',
        description: 'Category related end-points'
      },
      {
        name: 'Insights',
        description: 'Insight seed end-points'
      },
      {
        name: 'Posts',
        description: 'Post related end-points'
      },
      {
        name: 'Posts-Bookmark',
        description: 'Post-bookmark related end-points'
      },
      {
        name: 'Posts-Password',
        description: 'Post-password related end-points'
      },
      {
        name: 'Posts-Private',
        description: 'Post-private related end-points'
      },
      {
        name: 'Users',
        description: 'User related end-points'
      },
      {
        name: 'Sitemap',
        description: 'Sitemap related end-points'
      },
      {
        name: 'Tests',
        description: 'Testing end-points'
      }
    ],
    components: {
      securitySchemes: {
        swaggerBearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
};
