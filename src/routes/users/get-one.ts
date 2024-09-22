/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, User } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { ParamsUid } from '../../types/crud/params/params-uid';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':uid',
    schema: {
      tags: ['Users'],
      description: 'Get a single user',
      params: {
        type: 'object',
        properties: {
          uid: {
            $ref: 'partsFirebaseUidSchema#'
          }
        }
      },
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
    // prettier-ignore
    handler: async function (request: FastifyRequest<ParamsUid>, reply: FastifyReply): Promise<void> {
      // Extract post information from the request object
      const userFirebaseUid: string = String(request.params.uid)

      // Define the arguments for find a post
      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getUserSelect(),
          description: true
        },
        where: {
          firebaseUid: userFirebaseUid
        }
      };

      // Find the post
      await request.server.prisma.user
        .findUniqueOrThrow(userFindUniqueOrThrowArgs)
        .then((user: User) => {
          // Return the post
          return reply.status(200).send({
            data: user,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          const responseError: ResponseError = reply.server.prismaPlugin.getErrorPrisma(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
