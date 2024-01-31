/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Categories'],
      description: 'Removes specific Category from the database',
      security: [
        {
          Authorization: ['token']
        }
      ],
      params: {
        $ref: 'paramsIdSchema#'
      },
      querystring: {
        type: 'object',
        properties: {
          categoryId: {
            type: 'number'
          }
        },
        additionalProperties: false
      },
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
        400: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<ParamsId & QuerystringSearch>, reply: FastifyReply): Promise<any> {
      const { categoryId }: Record<string, any> = request.query;

      const categoryDeleteArgs: Prisma.CategoryDeleteArgs = {
        select: request.server.prismaService.getCategorySelect(),
        where: {
          userId: Number(request.user.id),
          id: Number(request.params.id)
        }
      };

      if (categoryId) {
        const postUpdateManyArgs: Prisma.PostUpdateManyArgs = {
          where: {
            userId: Number(request.user.id),
            categoryId: Number(request.params.id)
          },
          data: {
            categoryId
          }
        };

        await reply.server.prisma.post.updateMany(postUpdateManyArgs).catch((error: Error) => {
          return reply.server.prismaService.setError(reply, error);
        });
      }

      await reply.server.prisma.category
        .delete(categoryDeleteArgs)
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
