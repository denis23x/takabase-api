/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PostBookmark, Prisma, PrismaClient } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { PostBookmarkUpdateDto } from '../../types/dto/post-bookmark/post-bookmark-update';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Bookmark'],
      description: 'Updates a Private',
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
      body: {
        type: 'object',
        properties: {
          postId: {
            $ref: 'partsIdSchema#'
          }
        },
        required: ['postId']
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
    handler: async function (request: FastifyRequest<PostBookmarkUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postId: number = Number(request.body.postId);

      // Counter for transaction retries
      let requestRetries: number = 0;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<PostBookmark> => {
            // Define the arguments for updating a post bookmark
            const postBookmarkUpdateArgs: Prisma.PostBookmarkUpdateArgs = {
              where: {
                postId_userFirebaseUid: {
                  postId,
                  userFirebaseUid
                }
              },
              data: {
                postId
              }
            };

            // Return the post bookmark
            return prismaClient.postBookmark.update(postBookmarkUpdateArgs);
          }).then((postBookmark: PostBookmark) => {
            // Send success response with updated post bookmark
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
