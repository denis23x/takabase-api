/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category } from '../../database/client';
import { GetOneRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    schema: {
      params: {
        $ref: 'requestParameterIdSchema#'
      },
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
            $ref: 'requestQueryParameterScopeSchema#'
          }
        ]
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
    handler: async function (request: FastifyRequest<GetOneRequest>, reply: FastifyReply): Promise<any> {
      const { userId, scope }: Record<string, any> = request.query;

      const categoryFindUniqueOrThrowArgs: Prisma.CategoryFindUniqueOrThrowArgs = {
        select: request.server.prismaService.getCategorySelect(),
        where: {
          id: Number(request.params.id)
        }
      };

      /** Filter */

      if (userId) {
        categoryFindUniqueOrThrowArgs.where = {
          ...categoryFindUniqueOrThrowArgs.where,
          userId
        };
      }

      /** Scope */

      if (scope) {
        // prettier-ignore
        categoryFindUniqueOrThrowArgs.select = request.server.prismaService.setScope(categoryFindUniqueOrThrowArgs, scope);
      }

      await reply.server.prisma.category
        .findUniqueOrThrow(categoryFindUniqueOrThrowArgs)
        .then((category: Category) => {
          return reply.status(200).send({
            data: category,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
