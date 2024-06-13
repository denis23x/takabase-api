/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Category } from '../../database/client';
import { AlgoliaPostDto } from '../../types/dto/algolia/algolia-post';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'category',
    onRequest: [fastify.verifyIdToken, fastify.verifyAdmin],
    schema: {
      tags: ['Algolia'],
      description: 'Get database info for Algolia indices',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      querystring: {
        type: 'object',
        properties: {
          addRecords: {
            $ref: 'partsAlgoliaAddRecordsSchema#'
          }
        }
      },
      response: {
        '200': {
          oneOf: [
            {
              type: 'array'
            },
            {
              $ref: 'partsAlgoliaResponseSchema#'
            }
          ]
        },
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<AlgoliaPostDto>, reply: FastifyReply): Promise<any> {
      const category: Category[] = await request.server.prisma.category.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          userFirebaseUid: true,
          user: {
            select: {
              name: true,
              avatar: true
            }
          }
        }
      });

      const categoryObjects: (Category & Record<string, any>)[] = category.map((category: Category) => ({
        objectID: category.id,
        ...category
      }));

      switch (request.query.addRecords) {
        case 'Download file': {
          return reply.server.algoliaPlugin.getFile(categoryObjects, reply);
        }
        case 'Use the API': {
          return reply.server.algoliaPlugin.getSync('category', categoryObjects, reply);
        }
        default: {
          return reply.status(400).send({
            message: 'Invalid addRecords type specified',
            error: 'Bad request',
            statusCode: 400
          });
        }
      }
    }
  });
}
