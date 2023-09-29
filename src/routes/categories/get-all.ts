/** @format */

import { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma, Category } from '../../database/client';
import { CRUDAllRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      querystring: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            minLength: 3,
            maxLength: 9
          },
          userId: {
            type: 'number'
          },
          order: {
            type: 'string',
            enum: ['newest', 'oldest']
          },
          scope: {
            type: 'array',
            collectionFormat: 'multi',
            items: {
              type: 'string'
            },
            default: ['user', 'posts']
          },
          page: {
            type: 'number',
            default: 1
          },
          size: {
            type: 'number',
            default: 10
          }
        },
        required: ['page', 'size']
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
    handler: async function (request: FastifyRequest<CRUDAllRequest>, reply): Promise<any> {
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
          name: {
            search: search + '*'
          }
        };

        /** Default relevant order */

        categoryFindManyArgs.orderBy = {
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

      return request.server.prisma.category
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
