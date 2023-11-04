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
              },
              userName: {
                type: 'string',
                pattern: '^\\S*$'
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
      const { userId, userName, categoryId, query, orderBy, scope, size, page }: Record<string, any> = request.query;

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

      if (userName) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          user: {
            name: userName
          }
        };
      }

      if (categoryId) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          categoryId
        };
      }

      /** Search */

      if (query) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          name: {
            search: query + '*'
          },
          description: {
            search: query + '*'
          }
        };

        /** Default relevant order */

        postFindManyArgs.orderBy = {
          // ...postFindManyArgs.orderBy,
          _relevance: {
            fields: ['name', 'description'],
            sort: 'asc',
            search: query
          }
        };
      }

      /** Order */

      if (orderBy) {
        postFindManyArgs.orderBy = request.server.prismaService.setOrderBy(postFindManyArgs, orderBy);
      }

      /** Scope */

      if (scope) {
        postFindManyArgs.select = request.server.prismaService.setScope(postFindManyArgs, scope);
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
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
