/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Category } from '../../database/client';
import { PUTCategory } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: '/:id',
    schema: {
      tags: ['Categories'],
      description: 'Updates a Category',
      security: [
        {
          Authorization: ['token']
        }
      ],
      params: {
        $ref: 'requestParameterIdSchema#'
      },
      headers: {
        type: 'object',
        properties: {
          userId: {
            type: 'number'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          },
          description: {
            type: 'string'
          }
        },
        required: ['name']
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
    handler: async function (request: FastifyRequest<PUTCategory>, reply: FastifyReply): Promise<any> {
      const { id }: Record<string, number> = request.params;

      const { userid }: Record<string, any> = request.headers;

      const categoryUpdateInput: Prisma.CategoryUpdateInput = request.body;

      const categoryUpdateArgs: Prisma.CategoryUpdateArgs = {
        select: request.server.prismaService.getCategorySelect(),
        where: {
          userId: userid,
          id
        },
        data: {
          ...categoryUpdateInput
        }
      };

      return request.server.prisma.category
        .update(categoryUpdateArgs)
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
