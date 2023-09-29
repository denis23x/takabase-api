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
          search: {
            type: 'string',
            minLength: 3,
            maxLength: 9
          },
          userId: {
            type: 'number'
          },
          categoryId: {
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
            default: ['category', 'user']
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
      tags: ['Posts'],
      description: 'List all posts, paginated',
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
    handler: async function (request: FastifyRequest<CRUDAllRequest>, reply) {
      const { userId, categoryId, search, order, scope, size, page }: Record<string, any> = request.query;

      const postFindManyArgs: Prisma.PostFindManyArgs = {
        select: request.server.prismaService.getPostSelect(),
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

      if (categoryId) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          categoryId
        };
      }

      /** Search */

      if (search) {
        postFindManyArgs.where = {
          name: {
            search: search + '*'
          },
          description: {
            search: search + '*'
          }
        };

        /** Default relevant order */

        postFindManyArgs.orderBy = {
          _relevance: {
            fields: ['name', 'description'],
            sort: 'asc',
            search
          }
        };
      }

      /** Order */

      if (order) {
        postFindManyArgs.orderBy = {
          ...postFindManyArgs.orderBy,
          id: order === 'newest' ? 'desc' : 'asc'
        };

        /** For full text search make CategoryOrderByWithRelationAndSearchRelevanceInput[] */

        postFindManyArgs.orderBy = Object.entries(postFindManyArgs.orderBy).map((entry: any) => {
          const key: string = entry[0];
          const value: any = entry[1];

          return {
            [key]: value
          };
        });
      }

      /** Scope */

      if (scope) {
        if (scope.includes('category')) {
          postFindManyArgs.select = {
            ...postFindManyArgs.select,
            category: {
              select: request.server.prismaService.getCategorySelect()
            }
          };
        }

        if (scope.includes('user')) {
          postFindManyArgs.select = {
            ...postFindManyArgs.select,
            user: {
              select: request.server.prismaService.getUserSelect()
            }
          };
        }
      }

      const data: any[] = await request.server.prisma.post.findMany(postFindManyArgs);

      return reply.status(200).send({
        data,
        statusCode: 200
      });
    }
  });
}
