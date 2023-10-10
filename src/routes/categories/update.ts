/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category } from '../../database/client';
import { PUTCategory } from '../../types/requests';
import { UserType } from '@fastify/jwt';

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
          Authorization: ['token']
        }
      ],
      params: {
        $ref: 'requestParameterIdSchema#'
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
        required: ['name'],
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
    handler: async function (request: FastifyRequest<PUTCategory>, reply: FastifyReply): Promise<any> {
      const { id }: Record<string, number> = request.params;

      const currentUser: UserType = request.user;

      const categoryUpdateInput: Prisma.CategoryUpdateInput = request.body;

      const categoryUpdateArgs: Prisma.CategoryUpdateArgs = {
        select: request.server.prismaService.getCategorySelect(),
        where: {
          userId: Number(currentUser.id),
          id
        },
        data: {
          ...categoryUpdateInput
        }
      };

      await reply.server.prisma.category
        .update(categoryUpdateArgs)
        .then((category: Category) => {
          reply.status(200).send({
            data: category,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          reply.server.prismaService.getResponseError(reply, error);
        });
    }
  });
}
