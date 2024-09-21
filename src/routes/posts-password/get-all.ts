/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PostPassword } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Password'],
      description: 'List all posts protected by password, paginated',
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
                $ref: 'postPasswordSchema#'
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
      const postPasswordFindManyArgs: Prisma.PostPasswordFindManyArgs = {
        select: request.server.prismaPlugin.getPostPasswordSelect(),
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
        postPasswordFindManyArgs.where = {
          ...postPasswordFindManyArgs.where,
          name: {
            contains: query
          }
        };
      }

      // Find the posts
      await request.server.prisma.postPassword
        .findMany(postPasswordFindManyArgs)
        .then((postPasswordList: PostPassword[]) => {
          // Return the post
          return reply.status(200).send({
            data: postPasswordList,
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
