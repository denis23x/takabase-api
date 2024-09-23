/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PostPassword, Prisma, PrismaClient } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Password'],
      description: 'Removes the post protected by password',
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
              $ref: 'postPasswordSchema#'
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
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the user firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postId: number = Number(request.params.id);

      // Counter for transaction retries
      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<PostPassword> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // Define arguments to delete post
            const postPasswordDeleteArgs: Prisma.PostPasswordDeleteArgs = {
              select: {
                cover: true,
                markdown: true
              },
              where: {
                id: postId,
                userFirebaseUid
              }
            };

            // Delete post
            return prismaClient.postPassword.delete(postPasswordDeleteArgs);
          }).then((postPassword: PostPassword) => {
            // Extract post information from the request object
            const postCover: string | null = postPassword.cover;
            const postMarkdown: string = postPassword.markdown;

            // Get the list of images in the post markdown body
            const bodyMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);
            const postMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownImageList);

            // If there is a cover
            if (postCover) {
              //! Queue append
              request.server.lavinMQPlugin.setImageListMoveToTemp(JSON.stringify(request.server.markdownPlugin.getImageListFromBucket([postCover])));
            }

            // If there are post markdown images
            if (postMarkdownImageList.length) {
              //! Queue append
              request.server.lavinMQPlugin.setImageListMoveToTemp(JSON.stringify(postMarkdownImageList));
            }

            // Send success response with deleted post
            return reply.status(200).send({
              data: postPassword,
              statusCode: 200
            });
          });

          // Exit retry loop if transaction is successful
          break;
        } catch (error: any) {
          // Increment retry counter
          requestRetries++;

          //! Define rollback actions and handle errors
          const responseError: ResponseError | null = await reply.server.prismaPlugin.setErrorTransaction(error, requestRetries >= MAX_RETRIES, requestRollback);

          if (responseError) {
            return reply.status(responseError.statusCode).send(responseError);
          }
        }
      }
    }
  });
}
