/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';
import { AuthorizationLoginDto } from '../../types/dto/authorization/authorization-login';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: 'login',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Authorization'],
      description: 'Creates a new Token',
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
    handler: async function (request: FastifyRequest<AuthorizationLoginDto>, reply: FastifyReply): Promise<any> {
      // Define arguments to find a unique user based on firebaseUid
      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getUserSelect(),
          description: true
        },
        where: {
          firebaseUid: request.user.uid
        }
      };

      // Find the user based on the provided firebaseUid
      await reply.server.prisma.user.findUniqueOrThrow(userFindUniqueOrThrowArgs).then((user: User) => {
        // Send user data along with a bearer token for authentication
        return reply.status(200).send({
          data: user,
          statusCode: 200
        });
      });
    }
  });
}
