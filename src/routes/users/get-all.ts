/** @format */

import { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma } from '../../database/client';
import { CRUDAllRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      querystring: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          },
          search: {
            type: 'string',
            minLength: 3,
            maxLength: 9
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
            default: ['categories', 'posts']
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
      tags: ['Users'],
      description: 'List all users, paginated',
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: 'userSchema#'
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
    handler: async function (request: FastifyRequest<CRUDAllRequest>, reply) {
      const { name, search, order, scope, size, page }: Record<string, any> = request.query;

      const userFindManyArgs: Prisma.UserFindManyArgs = {
        select: request.server.prismaService.getUserSelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Search */

      if (name) {
        userFindManyArgs.where = {
          name
        };
      }

      /** Search */

      if (search) {
        userFindManyArgs.where = {
          name: {
            search: search + '*'
          }
        };

        /** Default relevant order */

        userFindManyArgs.orderBy = {
          _relevance: {
            fields: ['name'],
            sort: 'asc',
            search
          }
        };
      }

      /** Order */

      if (order) {
        userFindManyArgs.orderBy = {
          ...userFindManyArgs.orderBy,
          id: order === 'newest' ? 'desc' : 'asc'
        };

        /** For full text search make CategoryOrderByWithRelationAndSearchRelevanceInput[] */

        userFindManyArgs.orderBy = Object.entries(userFindManyArgs.orderBy).map((entry: any) => {
          const key: string = entry[0];
          const value: any = entry[1];

          return {
            [key]: value
          };
        });
      }

      /** Scope */

      if (scope) {
        if (scope.includes('categories')) {
          userFindManyArgs.select = {
            ...userFindManyArgs.select,
            categories: {
              select: request.server.prismaService.getCategorySelect(),
              orderBy: {
                id: 'desc'
              }
            }
          };
        }

        if (scope.includes('posts')) {
          userFindManyArgs.select = {
            ...userFindManyArgs.select,
            posts: {
              select: request.server.prismaService.getPostSelect(),
              orderBy: {
                id: 'desc'
              }
            }
          };
        }
      }

      const data: any[] = await request.server.prisma.user.findMany(userFindManyArgs);

      return reply.status(200).send({
        data,
        statusCode: 200
      });
    }
  });
}
