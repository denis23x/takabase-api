/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { User } from '../../database/client';
import { SearchIndex } from 'algoliasearch';
import { ChunkedBatchResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'users',
    onRequest: fastify.verifyIdToken,
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
    handler: async function (request: FastifyRequest<any>, reply: FastifyReply): Promise<any> {
      const user: User[] = await request.server.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          firebaseUid: true
        }
      });

      const userObjects: any = user.map((user: User) => ({
        objectID: user.id,
        ...user
      }));

      // @ts-ignore
      switch (request.query.addRecords) {
        case 'File': {
          const userObjectsString: string = JSON.stringify(userObjects);
          const userObjectsBuffer: Buffer = Buffer.from(userObjectsString);

          return reply
            .header('Content-Disposition', 'attachment; filename=userObjects.json')
            .type('application/json')
            .status(200)
            .send(userObjectsBuffer);
        }
        case 'API': {
          const userIndex: SearchIndex = request.server.algolia.initIndex('user');

          await userIndex.saveObjects(userObjects).then((chunkedBatchResponse: ChunkedBatchResponse) => {
            return reply.status(200).send({
              data: chunkedBatchResponse,
              statusCode: 200
            });
          });

          break;
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
