/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category } from '../../database/client';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    schema: {
      tags: ['Categories'],
      description: 'List all categories, paginated',
      querystring: {
        type: 'object',
        properties: {
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
                default: ['user', 'posts'],
                example: ['user', 'posts']
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
                $ref: 'categorySchema#'
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
      const { userFirebaseUid, userName, search, orderBy, scope, size, page }: Record<string, any> = request.query;

      const categoryFindManyArgs: Prisma.CategoryFindManyArgs = {
        select: request.server.prismaPlugin.getCategorySelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Filter */

      if (userFirebaseUid) {
        categoryFindManyArgs.where = {
          ...categoryFindManyArgs.where,
          userFirebaseUid
        };
      }

      if (userName) {
        categoryFindManyArgs.where = {
          ...categoryFindManyArgs.where,
          user: {
            name: userName
          }
        };
      }

      /** Search */

      if (search) {
        categoryFindManyArgs.where = {
          ...categoryFindManyArgs.where,
          name: {
            contains: search
          }
        };
      }

      /** Order */

      if (orderBy) {
        categoryFindManyArgs.orderBy = request.server.prismaPlugin.setOrderBy(categoryFindManyArgs, orderBy);
      }

      /** Scope */

      if (scope) {
        categoryFindManyArgs.select = request.server.prismaPlugin.setScope(categoryFindManyArgs, scope);
      }

      await reply.server.prisma.category
        .findMany(categoryFindManyArgs)
        .then((categoryList: Category[]) => {
          return reply.status(200).send({
            data: categoryList,
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
