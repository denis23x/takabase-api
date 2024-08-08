/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Category } from '../../database/client';
import type { AlgoliaGetDto } from '../../types/dto/algolia/algolia-get';

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
          $ref: 'partsAlgoliaResponseSchema#'
        },
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<AlgoliaGetDto>, reply: FastifyReply): Promise<any> {
      const category: Category[] = await request.server.prisma.category.findMany({
        select: {
          ...request.server.prismaPlugin.getCategorySelect(),
          user: {
            select: {
              id: true,
              avatar: true,
              name: true
            }
          }
        }
      });

      const categoryObjects: (Category & Record<string, any>)[] = category.map((category: Category) => ({
        ...request.server.helperPlugin.mapObjectValuesToNull(category),
        objectID: String(category.id),
        updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(category.updatedAt),
        createdAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(category.createdAt)
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
