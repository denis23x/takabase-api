/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Category } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    schema: {
      tags: ['Categories'],
      description: 'Get a category',
      params: {
        type: 'object',
        properties: {
          id: {
            $ref: 'partsIdSchema#'
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
    handler: async function (request: FastifyRequest<ParamsId>, reply: FastifyReply): Promise<any> {
      // Extract post information from the request object
      const categoryId: number = Number(request.params.id);

      // Define the arguments for find a category
      const categoryFindUniqueOrThrowArgs: Prisma.CategoryFindUniqueOrThrowArgs = {
        select: request.server.prismaPlugin.getCategorySelect(),
        where: {
          id: categoryId
        }
      };

      // Find the post
      await request.server.prisma.category
        .findUniqueOrThrow(categoryFindUniqueOrThrowArgs)
        .then((category: Category) => {
          // Return the post
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
