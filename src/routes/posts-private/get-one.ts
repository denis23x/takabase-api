/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PostPrivate } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Private'],
      description: 'Get a single private',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      params: {
        type: 'object',
        properties: {
          id: {
            $ref: 'partsIdSchema#'
          }
        }
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              $ref: 'postPrivateSchema#'
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
    handler: async function (request: FastifyRequest<ParamsId>, reply: FastifyReply): Promise<any> {
      // Extract the user firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postId: number = Number(request.params.id);

      // Define the arguments for find a post
      const postPrivateFindUniqueOrThrowArgs: Prisma.PostPrivateFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getPostPrivateSelect(),
          markdown: true,
          user: {
            select: request.server.prismaPlugin.getUserSelect()
          }
        },
        where: {
          id: postId,
          userFirebaseUid
        }
      };

      // Find the post
      await request.server.prisma.postPrivate
        .findUniqueOrThrow(postPrivateFindUniqueOrThrowArgs)
        .then((postPrivate: PostPrivate) => {
          // Return the post
          return reply.status(200).send({
            data: postPrivate,
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
