/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';
import { DeleteRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Users'],
      description: 'Removes specific User from the database',
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
              $ref: 'userSchema#'
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
    handler: async function (request: FastifyRequest<DeleteRequest>, reply: FastifyReply): Promise<any> {
      const userDeleteArgs: Prisma.UserDeleteArgs = {
        select: request.server.prismaService.getUserSelect(),
        where: {
          id: Number(request.user.id)
        }
      };

      await reply.server.prisma.user
        .delete(userDeleteArgs)
        .then((user: User) => {
          return reply.status(200).send({
            data: user,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.getResponseError(reply, error);
        });
    }
  });
}
