/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ParamsFirebaseUid } from '../../types/crud/params/params-firebase-uid';
import type { Post, PostBookmark, Prisma } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':firebaseUid',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Bookmark'],
      description: 'Get a single private',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      params: {
        type: 'object',
        properties: {
          firebaseUid: {
            $ref: 'partsFirebaseUidSchema#'
          }
        }
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              $ref: 'postSchema#'
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
    handler: async function (request: FastifyRequest<ParamsFirebaseUid>, reply: FastifyReply): Promise<any> {
      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postFirebaseUid: string = request.params.firebaseUid;

      // Define the arguments for finding unique post bookmark based on userFirebaseUid and postFirebaseUid
      const postBookmarkFindUniqueOrThrowArgs: Prisma.PostBookmarkFindUniqueOrThrowArgs = {
        select: {
          postFirebaseUid: true
        },
        where: {
          postFirebaseUid_userFirebaseUid: {
            postFirebaseUid,
            userFirebaseUid
          }
        }
      };

      // prettier-ignore
      const postBookmark: PostBookmark = await reply.server.prisma.postBookmark.findUniqueOrThrow(postBookmarkFindUniqueOrThrowArgs);

      // Define the arguments for finding post bookmark based on the list of postFirebaseUid
      const postFindUniqueOrThrowArgs: Prisma.PostFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getPostSelect(),
          firebaseUid: true,
          markdown: true
        },
        where: {
          firebaseUid: postBookmark.postFirebaseUid
        }
      };

      // Execute the query to find post based on the specified arguments
      await reply.server.prisma.post
        .findUniqueOrThrow(postFindUniqueOrThrowArgs)
        .then((post: Post) => {
          return reply.status(200).send({
            data: post,
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
