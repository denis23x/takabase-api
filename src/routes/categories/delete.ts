/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category } from '../../database/client';
import { DELETECategory } from '../../types/requests';
import { UserType } from '@fastify/jwt';

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
        $ref: 'requestParameterIdSchema#'
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
    handler: async function (request: FastifyRequest<DELETECategory>, reply: FastifyReply): Promise<any> {
      const { id }: Record<string, number> = request.params;

      const currentUser: UserType = request.user;

      const categoryDeleteArgs: Prisma.CategoryDeleteArgs = {
        select: request.server.prismaService.getCategorySelect(),
        where: {
          userId: Number(currentUser.id),
          id
        }
      };

      await reply.server.prisma.category
        .delete(categoryDeleteArgs)
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
