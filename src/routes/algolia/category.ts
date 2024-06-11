/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Category } from '../../database/client';
import { SearchIndex } from 'algoliasearch';
import { ChunkedBatchResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'category',
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
      const category: Category[] = await request.server.prisma.category.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          userFirebaseUid: true
        }
      });

      const categoryObjects: any = category.map((category: Category) => ({
        objectID: category.id,
        ...category
      }));

      // @ts-ignore
      switch (request.query.addRecords) {
        case 'File': {
          const categoryObjectsString: string = JSON.stringify(categoryObjects);
          const categoryObjectsBuffer: Buffer = Buffer.from(categoryObjectsString);

          return reply
            .header('Content-Disposition', 'attachment; filename=categoryObjects.json')
            .type('application/json')
            .status(200)
            .send(categoryObjectsBuffer);
        }
        case 'API': {
          const categoryIndex: SearchIndex = request.server.algolia.initIndex('category');

          await categoryIndex.saveObjects(categoryObjects).then((chunkedBatchResponse: ChunkedBatchResponse) => {
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
