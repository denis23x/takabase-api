/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, User } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: 'profile',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Authorization'],
      description: 'Retrieve authenticated user',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      response: {
        '200': {
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
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest, reply: FastifyReply): Promise<any> {
      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Define arguments for finding a unique user in the database
      const userFindUniqueArgs: Prisma.UserFindUniqueArgs = {
        select: {
          ...request.server.prismaPlugin.getUserSelect(),
          description: true
        },
        where: {
          firebaseUid: userFirebaseUid
        }
      };

      // Use Prisma to find a unique user based on the defined arguments
      await reply.server.prisma.user
        .findUnique(userFindUniqueArgs)
        .then((user: User) => {
          if (user) {
            return reply.status(200).send({
              data: user,
              statusCode: 200
            });
          }

          // If no user is found, redirect to the user create endpoint
          return reply.status(307).redirect('/api/v1/users/');
        })
        .catch((error: Error) => {
          const responseError: ResponseError = reply.server.prismaPlugin.getErrorPrisma(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
