/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, PostPassword } from '../../database/client';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Password'],
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
                $ref: 'postPasswordSchema#'
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

      const postPasswordFindManyArgs: Prisma.PostPasswordFindManyArgs = {
        select: request.server.prismaPlugin.getPostSelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Filter */

      if (username) {
        postPasswordFindManyArgs.where = {
          ...postPasswordFindManyArgs.where,
          user: {
            name: username
          }
        };
      }

      /** Search */

      if (query) {
        postPasswordFindManyArgs.where = {
          ...postPasswordFindManyArgs.where,
          name: {
            contains: query
          }
        };
      }

      /** Scope */

      if (scope) {
        postPasswordFindManyArgs.select = request.server.prismaPlugin.setScope(postPasswordFindManyArgs, scope);
      }

      await reply.server.prisma.postPassword
        .findMany(postPasswordFindManyArgs)
        .then((postPasswordList: PostPassword[]) => {
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
