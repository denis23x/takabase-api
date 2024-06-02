/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post } from '../../database/client';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    schema: {
      tags: ['Posts'],
      description: 'List all posts, paginated',
      querystring: {
        type: 'object',
        properties: {
          categoryId: {
            $ref: 'partsIdSchema#'
          },
          userId: {
            $ref: 'partsIdSchema#'
          },
          userFirebaseUid: {
            $ref: 'partsFirebaseUidSchema#'
          },
          userName: {
            $ref: 'partsUserNameSchema#'
          },
          search: {
            $ref: 'partsSearchSchema#'
          },
          orderBy: {
            $ref: 'partsPageOrderBySchema#'
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
                default: ['user', 'category'],
                example: ['user', 'category']
              }
            ]
          }
        },
        required: ['page', 'size']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: 'postSchema#'
              }
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<QuerystringSearch>, reply: FastifyReply): Promise<any> {
      const { userId, userFirebaseUid, userName, categoryId, search, orderBy, scope, size, page }: Record<string, any> =
        request.query;

      const postFindManyArgs: Prisma.PostFindManyArgs = {
        select: request.server.prismaPlugin.getPostSelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Filter */

      if (userId) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          userId
        };
      }

      if (userFirebaseUid) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          userFirebaseUid
        };
      }

      if (categoryId) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          categoryId
        };
      }

      if (userName) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          user: {
            name: userName
          }
        };
      }

      /** Search */

      if (search) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          name: {
            contains: search
          }
        };
      }

      /** Order */

      if (orderBy) {
        postFindManyArgs.orderBy = request.server.prismaPlugin.setOrderBy(postFindManyArgs, orderBy);
      }

      /** Scope */

      if (scope) {
        postFindManyArgs.select = request.server.prismaPlugin.setScope(postFindManyArgs, scope);
      }

      await reply.server.prisma.post
        .findMany(postFindManyArgs)
        .then((postList: Post[]) => {
          return reply.status(200).send({
            data: postList,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          const responseError: ResponseError = reply.server.prismaPlugin.getError(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
