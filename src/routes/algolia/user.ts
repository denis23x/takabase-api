/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../../database/client';
import type { AlgoliaGetDto } from '../../types/dto/algolia/algolia-get';

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
      const user: User[] = await request.server.prisma.user.findMany({
        select: {
          ...request.server.prismaPlugin.getUserSelect(),
          firebaseUid: true,
          description: true
        }
      });

      const userObjects: (User & Record<string, any>)[] = user.map((user: User) => ({
        ...request.server.helperPlugin.mapObjectValuesToNull(user),
        objectID: String(user.firebaseUid),
        updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(user.updatedAt),
        createdAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(user.createdAt)
      }));

      switch (request.query.addRecords) {
        case 'Download file': {
          return request.server.algoliaPlugin.getFile(userObjects, reply);
        }
        case 'Use the API': {
          return request.server.algoliaPlugin
            .setClear('user')
            .then(() => request.server.algoliaPlugin.getSync('user', userObjects, reply));
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
