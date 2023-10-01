/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, User } from '../../database/client';
import { CRUDIdRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    schema: {
      params: {
        $ref: 'requestParameterIdSchema#'
      },
      querystring: {
        type: 'object',
        properties: {
          scope: {
            type: 'array',
            collectionFormat: 'multi',
            items: {
              type: 'string'
            },
            default: ['categories', 'posts']
          }
        }
      },
      tags: ['Users'],
      description: 'Get a single user',
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              $ref: 'userSchema#'
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        404: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<CRUDIdRequest>, reply: FastifyReply): Promise<void> {
      const { id }: Record<string, number> = request.params;

      const { scope }: Record<string, any> = request.query;

      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: request.server.prismaService.getUserSelect(),
        where: {
          id
        }
      };

      /** Scope */

      if (scope) {
        if (scope.includes('categories')) {
          userFindUniqueOrThrowArgs.select = {
            ...userFindUniqueOrThrowArgs.select,
            categories: {
              select: request.server.prismaService.getCategorySelect(),
              orderBy: {
                id: 'desc'
              }
            }
          };
        }

        if (scope.includes('posts')) {
          userFindUniqueOrThrowArgs.select = {
            ...userFindUniqueOrThrowArgs.select,
            posts: {
              select: request.server.prismaService.getPostSelect(),
              orderBy: {
                id: 'desc'
              }
            }
          };
        }
      }

      return request.server.prisma.user
        .findUniqueOrThrow(userFindUniqueOrThrowArgs)
        .then((user: User) => {
          return reply.status(200).send({
            data: user,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.getResponseError(reply, error);
        });
    }
  });
}
