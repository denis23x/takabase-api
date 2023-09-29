/** @format */

import { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma } from '../../database/client';
import { CRUDIdRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/:id',
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
    handler: async function (request: FastifyRequest<CRUDIdRequest>, reply) {
      const { id }: Record<string, number> = request.params;
      const { scope }: Record<string, any> = request.query;

      const userFindUniqueArgs: Prisma.UserFindUniqueArgs = {
        select: request.server.prismaService.getUserSelect(),
        where: {
          id
        }
      };

      /** Scope */

      if (scope) {
        if (scope.includes('categories')) {
          userFindUniqueArgs.select = {
            ...userFindUniqueArgs.select,
            categories: {
              select: request.server.prismaService.getCategorySelect(),
              orderBy: {
                id: 'desc'
              }
            }
          };
        }

        if (scope.includes('posts')) {
          userFindUniqueArgs.select = {
            ...userFindUniqueArgs.select,
            posts: {
              select: request.server.prismaService.getPostSelect(),
              orderBy: {
                id: 'desc'
              }
            }
          };
        }
      }

      const data: any = await request.server.prisma.user.findUnique(userFindUniqueArgs);

      if (data === null) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'User not found',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        data,
        statusCode: 200
      });
    }
  });
}
