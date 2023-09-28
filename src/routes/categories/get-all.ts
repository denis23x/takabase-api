/** @format */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { Prisma } from '../../database/client';

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
          order: {
            type: 'string',
            enum: ['newest', 'oldest']
          },
          scope: {
            type: 'array',
            maxItems: 2,
            items: {
              type: 'string',
              enum: ['user', 'posts']
            }
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
                type: 'object',
                properties: {
                  id: {
                    type: 'number'
                  },
                  userId: {
                    type: 'number'
                  },
                  name: {
                    type: 'string'
                  },
                  description: {
                    type: 'string',
                    nullable: true
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time'
                  },
                  updatedAt: {
                    type: 'string',
                    format: 'date-time'
                  },
                  deletedAt: {
                    type: 'string',
                    nullable: true,
                    format: 'date-time'
                  }
                }
              }
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: {
              type: 'string'
            },
            message: {
              type: 'string'
            },
            statusCode: {
              type: 'number'
            }
          }
        }
      }
    },
    handler: async function (request: FastifyRequest<CrudAllRequest>, reply) {
      const { userId, search, order, scope, size, page }: Record<string, any> = request.query;

      const categoryFindManyArgs: Prisma.CategoryFindManyArgs = {
        select: {
          id: true,
          name: true,
          description: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        },
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
              select: {
                id: true,
                facebookId: true,
                githubId: true,
                googleId: true,
                name: true,
                description: true,
                avatar: true,
                email: true,
                emailConfirmed: true,
                password: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true
              }
            }
          };
        }

        if (scope.includes('posts')) {
          categoryFindManyArgs.select = {
            ...categoryFindManyArgs.select,
            posts: {
              select: {
                id: true,
                name: true,
                description: true,
                markdown: true,
                image: true,
                userId: true,
                categoryId: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true
              },
              orderBy: {
                id: 'desc'
              }
            }
          };
        }
      }

      const data: any[] = await request.server.prisma.category.findMany(categoryFindManyArgs);

      return reply.status(200).send({
        data,
        statusCode: 200
      });
    }
  });
}
