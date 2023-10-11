/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post } from '../../database/client';
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
              categoryId: {
                type: 'number'
              },
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
    handler: async function (request: FastifyRequest<GetAllRequest>, reply: FastifyReply): Promise<any> {
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
          ...postFindManyArgs.where,
          name: {
            search: search + '*'
          },
          description: {
            search: search + '*'
          }
        };

        /** Default relevant order */

        postFindManyArgs.orderBy = {
          ...postFindManyArgs.orderBy,
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

      await reply.server.prisma.post
        .findMany(postFindManyArgs)
        .then((postList: Post[]) => {
          return reply.status(200).send({
            data: postList,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.getResponseError(reply, error);
        });
    }
  });
}
