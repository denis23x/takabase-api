/** @format */

import { SwaggerOptions } from '@fastify/swagger';

export const swaggerConfig: SwaggerOptions = {
  swagger: {
    info: {
      title: 'RESTful APIs using Fastify',
      description: 'CRUDs using Swagger, Fastify and Prisma',
      version: '0.0.1'
    },
    externalDocs: {
      url: 'https://swagger.io',
      description: 'Find more info here'
    },
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      {
        name: 'Authorization',
        description: 'Authorization end-points'
      },
      {
        name: 'Categories',
        description: 'Category related end-points'
      },
      {
        name: 'Posts',
        description: 'Post related end-points'
      },
      {
        name: 'Users',
        description: 'User related end-points'
      }
    ],
    securityDefinitions: {
      Authorization: {
        type: 'apiKey',
        name: 'token',
        in: 'cookie'
      }
    }
  }
};
