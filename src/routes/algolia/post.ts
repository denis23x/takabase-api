/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post } from '../../database/client';
import { AlgoliaPostDto } from '../../types/dto/algolia/algolia-post';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'post',
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
      const post: Post[] = await request.server.prisma.post.findMany({
        select: {
          ...request.server.prismaPlugin.getPostSelect(),
          user: {
            select: {
              id: true
            }
          },
          category: {
            select: {
              id: true
            }
          }
        }
      });

      const postObjects: (Post & Record<string, any>)[] = post.map((post: Post) => ({
        ...request.server.helperPlugin.mapObjectValuesToNull(post),
        objectID: String(post.id),
        updatedAtUnixTimestamp: request.server.algoliaPlugin.getUnixTimestamp(post.updatedAt),
        createdAtUnixTimestamp: request.server.algoliaPlugin.getUnixTimestamp(post.createdAt)
      }));

      switch (request.query.addRecords) {
        case 'Download file': {
          return reply.server.algoliaPlugin.getFile(postObjects, reply);
        }
        case 'Use the API': {
          return reply.server.algoliaPlugin.getSync('post', postObjects, reply);
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
