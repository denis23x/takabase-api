/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';

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
    handler: async function (request: FastifyRequest, reply: FastifyReply): Promise<any> {
      // Extract the firebaseUid from the authenticated user
      const firebaseUid: string = request.user.uid;

      // Define arguments to upsert user based on firebaseUid
      const userUpsertArgs: Prisma.UserUpsertArgs = {
        select: {
          ...request.server.prismaPlugin.getUserSelect(),
          description: true
        },
        where: {
          firebaseUid
        },
        update: {},
        create: {
          name: [request.user.name, request.user.uid.slice(-8)].join('-'),
          terms: true,
          firebaseUid
        }
      };

      // Find the user based on the provided firebaseUid
      await reply.server.prisma.user.upsert(userUpsertArgs).then((user: User) => {
        return reply.status(200).send({
          data: user,
          statusCode: 200
        });
      });
    }
  });
}
