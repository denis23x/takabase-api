/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, PostPrivate } from '../../database/client';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Private'],
      description: 'List all privates, paginated',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      querystring: {
        type: 'object',
        properties: {
          username: {
            $ref: 'partsUsernameSchema#'
          },
          query: {
            $ref: 'partsPageQuerySchema#'
          },
          page: {
            $ref: 'partsPageSchema#'
          },
          size: {
            $ref: 'partsPageSizeSchema#'
          },
          scope: {
            allOf: [
              {
                $ref: 'partsScopeSchema#'
              },
              {
                default: ['user'],
                example: ['user']
              }
            ]
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
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<QuerystringSearch>, reply: FastifyReply): Promise<any> {
      const { username, query, scope, size, page }: Record<string, any> = request.query;

      const postPrivateFindManyArgs: Prisma.PostPrivateFindManyArgs = {
        select: request.server.prismaPlugin.getPostSelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Filter */

      if (username) {
        postPrivateFindManyArgs.where = {
          ...postPrivateFindManyArgs.where,
          user: {
            name: username
          }
        };
      }

      /** Search */

      if (query) {
        postPrivateFindManyArgs.where = {
          ...postPrivateFindManyArgs.where,
          name: {
            contains: query
          }
        };
      }

      /** Scope */

      if (scope) {
        postPrivateFindManyArgs.select = request.server.prismaPlugin.setScope(postPrivateFindManyArgs, scope);
      }

      await reply.server.prisma.postPrivate
        .findMany(postPrivateFindManyArgs)
        .then((postPrivateList: PostPrivate[]) => {
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
