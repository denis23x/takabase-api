/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post } from '../../database/client';
import { SearchIndex } from 'algoliasearch';
import { ChunkedBatchResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'post',
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
      const post: Post[] = await request.server.prisma.post.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          firebaseUid: true,
          categoryId: true,
          userFirebaseUid: true
        }
      });

      const postObjects: any = post.map((post: Post) => ({
        objectID: post.id,
        ...post
      }));

      // @ts-ignore
      switch (request.query.addRecords) {
        case 'File': {
          const postObjectsString: string = JSON.stringify(postObjects);
          const postObjectsBuffer: Buffer = Buffer.from(postObjectsString);

          return reply
            .header('Content-Disposition', 'attachment; filename=postObjects.json')
            .type('application/json')
            .status(200)
            .send(postObjectsBuffer);
        }
        case 'API': {
          const postIndex: SearchIndex = request.server.algolia.initIndex('post');

          await postIndex.saveObjects(postObjects).then((chunkedBatchResponse: ChunkedBatchResponse) => {
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
