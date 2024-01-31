/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category } from '../../database/client';
import { CategoryCreateDto } from '../../types/dto/category/category-create';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Categories'],
      description: 'Creates a new Category',
      security: [
        {
          Authorization: ['token']
        }
      ],
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
        required: ['name'],
        additionalProperties: false
      },
      response: {
        201: {
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
    handler: async function (request: FastifyRequest<CategoryCreateDto>, reply: FastifyReply): Promise<any> {
      const categoryCreateInput: Prisma.CategoryCreateInput = {
        ...request.body,
        user: {
          connect: {
            id: Number(request.user.id)
          }
        }
      };

      const categoryCreateArgs: Prisma.CategoryCreateArgs = {
        select: request.server.prismaService.getCategorySelect(),
        data: categoryCreateInput
      };

      await reply.server.prisma.category
        .create(categoryCreateArgs)
        .then((category: Category) => {
          return reply.status(201).send({
            data: category,
            statusCode: 201
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
