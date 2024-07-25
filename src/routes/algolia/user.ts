/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../../database/client';
import type { AlgoliaPostDto } from '../../types/dto/algolia/algolia-post';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'user',
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
      const user: User[] = await request.server.prisma.user.findMany({
        select: {
          ...request.server.prismaPlugin.getUserSelect(),
          description: true
        }
      });

      const userObjects: (User & Record<string, any>)[] = user.map((user: User) => ({
        ...request.server.helperPlugin.mapObjectValuesToNull(user),
        objectID: String(user.id),
        updatedAtUnixTimestamp: request.server.algoliaPlugin.getUnixTimestamp(user.updatedAt),
        createdAtUnixTimestamp: request.server.algoliaPlugin.getUnixTimestamp(user.createdAt)
      }));

      switch (request.query.addRecords) {
        case 'Download file': {
          return reply.server.algoliaPlugin.getFile(userObjects, reply);
        }
        case 'Use the API': {
          return reply.server.algoliaPlugin.getSync('user', userObjects, reply);
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
