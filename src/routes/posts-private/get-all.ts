/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PostPrivate } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Private'],
      description: 'List of all private posts',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      querystring: {
        type: 'object',
        properties: {
          query: {
            $ref: 'partsPageQuerySchema#'
          },
          page: {
            $ref: 'partsPageSchema#'
          },
          size: {
            $ref: 'partsPageSizeSchema#'
          }
        },
        required: ['page', 'size']
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: 'postPrivateSchema#'
              }
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<QuerystringSearch>, reply: FastifyReply): Promise<any> {
      // Extract the user firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract information from the request query
      const size: number = request.query.size;
      const page: number = request.query.page;
      const query: string = request.query.query;

      // Define the arguments for find a posts
      const postPrivateFindManyArgs: Prisma.PostPrivateFindManyArgs = {
        select: request.server.prismaPlugin.getPostPrivateSelect(),
        where: {
          userFirebaseUid
        },
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Search */

      if (query) {
        postPrivateFindManyArgs.where = {
          ...postPrivateFindManyArgs.where,
          name: {
            contains: query
          }
        };
      }

      // Find the posts
      await request.server.prisma.postPrivate
        .findMany(postPrivateFindManyArgs)
        .then((postPrivateList: PostPrivate[]) => {
          // Return the post
          return reply.status(200).send({
            data: postPrivateList,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          const responseError: ResponseError = reply.server.prismaPlugin.getErrorPrisma(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
