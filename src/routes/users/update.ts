/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, User } from '../../database/client';
import { PUTUser } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: '/:id',
    schema: {
      tags: ['Users'],
      description: 'Updates a User',
      security: [
        {
          Authorization_Token: ['Authorization']
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
          },
          avatar: {
            type: 'string'
          },
          email: {
            type: 'string',
            format: 'email'
          }
        }
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
    handler: async function (request: FastifyRequest<PUTUser>, reply: FastifyReply): Promise<any> {
      const { userid }: Record<string, any> = request.headers;

      const userUpdateInput: Prisma.UserUpdateInput = request.body;

      const userUpdateArgs: Prisma.UserUpdateArgs = {
        select: request.server.prismaService.getUserSelect(),
        where: {
          id: userid
        },
        data: {
          ...userUpdateInput
        }
      };

      return request.server.prisma.user
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
