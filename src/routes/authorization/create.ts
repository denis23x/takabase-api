/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';
import { AuthorizationLoginDto } from '../../types/dto/authorization/authorization-login';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    schema: {
      tags: ['Authorization'],
      description: 'Creates a new Token',
      body: {
        type: 'object',
        properties: {
          firebaseUid: {
            type: 'string'
          }
        },
        required: ['firebaseUid'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              allOf: [
                {
                  type: 'object',
                  properties: {
                    bearer: {
                      type: 'string'
                    }
                  }
                },
                {
                  $ref: 'userSchema#'
                }
              ]
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
    handler: async function (request: FastifyRequest<AuthorizationLoginDto>, reply: FastifyReply): Promise<any> {
      const { firebaseUid }: Record<string, string> = request.body;

      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getUserSelect(),
          firebaseUid: true
        },
        where: {
          firebaseUid
        }
      };

      await reply.server.prisma.user.findUniqueOrThrow(userFindUniqueOrThrowArgs).then((user: User) => {
        const signUser: Partial<User> = {
          id: user.id,
          firebaseUid: user.firebaseUid
        };

        // Prevent firebaseUid expose
        delete user.firebaseUid;

        return reply.status(200).send({
          data: {
            ...user,
            bearer: reply.server.authenticateHandler.signUser(signUser)
          },
          statusCode: 200
        });
      });
    }
  });
}
