/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';
import { UpdateUser } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Users'],
      description: 'Updates a User',
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
            type: 'string',
            nullable: true
          },
          avatar: {
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
    handler: async function (request: FastifyRequest<UpdateUser>, reply: FastifyReply): Promise<any> {
      const userUpdateInput: Prisma.UserUpdateInput = {
        ...request.body
      };

      const userUpdateArgs: Prisma.UserUpdateArgs = {
        select: request.server.prismaService.getUserSelect(),
        where: {
          id: Number(request.user.id)
        },
        data: userUpdateInput
      };

      await reply.server.prisma.user
        .update(userUpdateArgs)
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
