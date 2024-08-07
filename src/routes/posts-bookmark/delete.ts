/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ParamsFirebaseUid } from '../../types/crud/params/params-firebase-uid';
import type { PostBookmark, Prisma, PrismaClient } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':firebaseUid',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Bookmark'],
      description: 'Removes specific Private from the database',
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
              $ref: 'postBookmarkSchema#'
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
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postFirebaseUid: string = request.params.firebaseUid;

      // Counter for transaction retries
      let requestRetries: number = 0;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<PostBookmark> => {
            // Define the arguments for deleting a post bookmark
            const postBookmarkDeleteArgs: Prisma.PostBookmarkDeleteArgs = {
              where: {
                postFirebaseUid_userFirebaseUid: {
                  userFirebaseUid,
                  postFirebaseUid
                }
              }
            };

            // Return the post bookmark
            return prismaClient.postBookmark.delete(postBookmarkDeleteArgs);
          }).then((postBookmark: PostBookmark) => {
            // Send success response with deleted post bookmark
            return reply.status(200).send({
              data: postBookmark,
              statusCode: 200
            });
          });

          // Exit retry loop if transaction is successful
          break;
        } catch (error: any) {
          // Increment retry counter
          requestRetries++;

          // Send error response
          const responseError: ResponseError | null = reply.server.prismaPlugin.getErrorPrisma(error);

          if (responseError) {
            return reply.status(responseError.statusCode).send(responseError);
          }
        }
      }
    }
  });
}
