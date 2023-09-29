/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Category } from '../../database/client';
import { CRUDIdRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
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
            default: ['user', 'posts']
          }
        }
      },
      tags: ['Categories'],
      description: 'Get a single category',
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              $ref: 'categorySchema#'
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
    handler: async function (request: FastifyRequest<CRUDIdRequest>, reply: FastifyReply): Promise<any> {
      const { id }: Record<string, number> = request.params;
      const { scope }: Record<string, any> = request.query;

      const categoryFindUniqueOrThrowArgs: Prisma.CategoryFindUniqueOrThrowArgs = {
        select: request.server.prismaService.getCategorySelect(),
        where: {
          id
        }
      };

      /** Scope */

      if (scope) {
        if (scope.includes('user')) {
          categoryFindUniqueOrThrowArgs.select = {
            ...categoryFindUniqueOrThrowArgs.select,
            user: {
              select: request.server.prismaService.getUserSelect()
            }
          };
        }

        if (scope.includes('posts')) {
          categoryFindUniqueOrThrowArgs.select = {
            ...categoryFindUniqueOrThrowArgs.select,
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
        .findUniqueOrThrow(categoryFindUniqueOrThrowArgs)
        .then((category: Category) => {
          return reply.status(200).send({
            data: category,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.getResponseError(reply, error);
        });
    }
  });
}
