/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Category } from '../../database/client';
import type { QuerystringScope } from '../../types/crud/querystring/querystring-scope';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    schema: {
      tags: ['Categories'],
      description: 'Get a single category',
      params: {
        type: 'object',
        properties: {
          id: {
            $ref: 'partsIdSchema#'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          scope: {
            allOf: [
              {
                $ref: 'partsScopeSchema#'
              },
              {
                default: ['user', 'posts'],
                example: ['user', 'posts']
              }
            ]
          }
        }
      },
      response: {
        '200': {
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
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<ParamsId & QuerystringScope>, reply: FastifyReply): Promise<any> {
      const { scope }: Record<string, any> = request.query;

      const categoryFindUniqueOrThrowArgs: Prisma.CategoryFindUniqueOrThrowArgs = {
        select: request.server.prismaPlugin.getCategorySelect(),
        where: {
          id: Number(request.params.id)
        }
      };

      /** Scope */

      if (scope) {
        // prettier-ignore
        categoryFindUniqueOrThrowArgs.select = request.server.prismaPlugin.setScope(categoryFindUniqueOrThrowArgs, scope);
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
          const responseError: ResponseError = reply.server.prismaPlugin.getErrorPrisma(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
