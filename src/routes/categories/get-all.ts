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
      const { userId, search, order, scope, size, page }: Record<string, any> = request.query;

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

      if (search) {
        categoryFindManyArgs.where = {
          ...categoryFindManyArgs.where,
          name: {
            search: search + '*'
          }
        };

        /** Default relevant order */

        categoryFindManyArgs.orderBy = {
          ...categoryFindManyArgs.orderBy,
          _relevance: {
            fields: ['name'],
            sort: 'asc',
            search
          }
        };
      }

      /** Order */

      if (order) {
        categoryFindManyArgs.orderBy = {
          ...categoryFindManyArgs.orderBy,
          id: order === 'newest' ? 'desc' : 'asc'
        };

        /** For full text search make CategoryOrderByWithRelationAndSearchRelevanceInput[] */

        categoryFindManyArgs.orderBy = Object.entries(categoryFindManyArgs.orderBy).map((entry: any) => {
          const key: string = entry[0];
          const value: any = entry[1];

          return {
            [key]: value
          };
        });
      }

      /** Scope */

      if (scope) {
        if (scope.includes('user')) {
          categoryFindManyArgs.select = {
            ...categoryFindManyArgs.select,
            user: {
              select: request.server.prismaService.getUserSelect()
            }
          };
        }

        if (scope.includes('posts')) {
          categoryFindManyArgs.select = {
            ...categoryFindManyArgs.select,
            posts: {
              select: request.server.prismaService.getPostSelect(),
              orderBy: {
                id: 'desc'
              }
            }
          };
        }
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
          return reply.server.prismaService.getResponseError(reply, error);
        });
    }
  });
}
