/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category } from '../../database/client';
import { CategoryCreateDto } from '../../types/dto/category/category-create';
import { ResponseError } from '../../types/crud/response/response-error.schema';

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
          Authorization: []
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
      const categoryCreateArgs: Prisma.CategoryCreateArgs = {
        select: request.server.prismaPlugin.getCategorySelect(),
        data: {
          ...request.body,
          user: {
            connect: {
              id: Number(request.user.id)
            }
          }
        }
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
          const responseError: ResponseError = reply.server.prismaPlugin.getError(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
