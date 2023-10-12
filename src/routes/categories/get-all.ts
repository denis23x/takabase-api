/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category } from '../../database/client';
import { GetAllRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    schema: {
      querystring: {
        allOf: [
          {
            type: 'object',
            properties: {
              userId: {
                type: 'number'
              }
            }
          },
          {
            $ref: 'requestQueryParameterSchema#'
          },
          {
            $ref: 'requestQueryParameterScopeSchema#'
          }
        ]
      },
      tags: ['Categories'],
      description: 'List all categories, paginated',
      response: {
        200: {
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
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<GetAllRequest>, reply: FastifyReply): Promise<any> {
      const { userId, query, orderBy, scope, size, page }: Record<string, any> = request.query;

      const categoryFindManyArgs: Prisma.CategoryFindManyArgs = {
        select: request.server.prismaService.getCategorySelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Filter */

      if (userId) {
        categoryFindManyArgs.where = {
          ...categoryFindManyArgs.where,
          userId
        };
      }

      /** Search */

      if (query) {
        categoryFindManyArgs.where = {
          ...categoryFindManyArgs.where,
          name: {
            search: query + '*'
          },
          description: {
            search: query + '*'
          }
        };

        /** Default relevant order */

        categoryFindManyArgs.orderBy = {
          // ...categoryFindManyArgs.orderBy,
          _relevance: {
            fields: ['name', 'description'],
            sort: 'asc',
            search: query
          }
        };
      }

      /** Order */

      if (orderBy) {
        categoryFindManyArgs.orderBy = request.server.prismaService.setOrderBy(categoryFindManyArgs, orderBy);
      }

      /** Scope */

      if (scope) {
        categoryFindManyArgs.select = request.server.prismaService.setScope(categoryFindManyArgs, scope);
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
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
