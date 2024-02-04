/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category } from '../../database/client';
import { CategoryUpdateDto } from '../../types/dto/category/category-update';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Categories'],
      description: 'Updates a Category',
      security: [
        {
          Authorization: []
        }
      ],
      params: {
        $ref: 'paramsIdSchema#'
      },
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          },
          description: {
            type: 'string',
            nullable: true
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
    handler: async function (request: FastifyRequest<CategoryUpdateDto>, reply: FastifyReply): Promise<any> {
      const categoryUpdateInput: Prisma.CategoryUpdateInput = {
        ...request.body
      };

      const categoryUpdateArgs: Prisma.CategoryUpdateArgs = {
        select: request.server.prismaService.getCategorySelect(),
        where: {
          userId: Number(request.user.id),
          id: Number(request.params.id)
        },
        data: categoryUpdateInput
      };

      await reply.server.prisma.category
        .update(categoryUpdateArgs)
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
