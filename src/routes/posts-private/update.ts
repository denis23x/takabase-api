/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PostPrivate, PrismaClient } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { PostUpdateDto } from '../../types/dto/post/post-update';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Private'],
      description: 'Updates the private post',
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
          name: {
            $ref: 'partsPostNameSchema#'
          },
          description: {
            $ref: 'partsPostDescriptionSchema#'
          },
          markdown: {
            $ref: 'partsPostMarkdownSchema#'
          },
          image: {
            $ref: 'partsImageSchema#'
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
    // prettier-ignore
    handler: async function (request: FastifyRequest<PostUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the user firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postId: number = Number(request.params.id);
      const postCover: string | null = request.body.image as any;
      const postMarkdown: string = request.body.markdown as any;

      // Get the list of images in the post markdown body
      const bodyMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);
      const tempMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownImageList).filter((bodyMarkdownImage: string) => bodyMarkdownImage.startsWith('temp'));

      // Define the arguments for find a post
      const postPrivateFindUniqueOrThrowArgs: Prisma.PostPrivateFindUniqueOrThrowArgs = {
        select: {
          image: true,
          markdown: true
        },
        where: {
          id: postId,
          userFirebaseUid
        }
      };

      const postPrivate: PostPrivate = await request.server.prisma.postPrivate.findUniqueOrThrow(postPrivateFindUniqueOrThrowArgs);

      // Counter for transaction retries
      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<PostPrivate> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // If there is a new cover provided
            if (postCover && postCover !== postPrivate.image) {
              // Get the cover relative /temp URL
              const tempCoverList: string[] = request.server.markdownPlugin.getImageListFromBucket([postCover]);

              // Move the /temp cover to the /covers
              const postCoverList: string[] = await request.server.storagePlugin
                .setImageListMove(tempCoverList, 'covers')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for cover to move it to the /temp back
              requestRollback.postCoverList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postCoverList, 'temp');
              };

              // Replace the cover URL in the request body with the new URL
              request.body.image = request.server.markdownPlugin.getImageListReplace(postCover, tempCoverList, postCoverList);
            }

            // If there is a previous cover exists
            if (postCover === null || postCover !== postPrivate.image) {
              // Get the cover relative URL
              const postPreviousCoverList: string[] = request.server.markdownPlugin.getImageListFromBucket([postPrivate.image]);

              // Move the previous and unworthy cover to the /temp
              const tempPreviousCoverList: string[] = await request.server.storagePlugin
                .setImageListMove(postPreviousCoverList, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for cover to move it to the /covers back
              requestRollback.tempCoverList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempPreviousCoverList, 'covers');
              };
            }

            // If there are /temp markdown images
            if (tempMarkdownImageList.length) {
              // Move the /temp markdown images to the /images
              const postMarkdownImageList: string[] = await request.server.storagePlugin
                .setImageListMove(tempMarkdownImageList, 'images')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for moving markdown images to the /temp back
              requestRollback.postMarkdownImageList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postMarkdownImageList, 'temp');
              };

              // Replace the markdown body with the new URL images list
              request.body.markdown = request.server.markdownPlugin.getImageListReplace(postMarkdown, tempMarkdownImageList, postMarkdownImageList);
            }

            // Get the original markdown images list
            const postMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(postPrivate.markdown);

            // Get the updated markdown images list
            const nextMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(String(request.body.markdown));

            // Get the unused markdown images list
            const postMarkdownImageListUnused: string[] = request.server.markdownPlugin.getImageListFromBucket(postMarkdownImageList.filter((postMarkdownImage: string) => !nextMarkdownImageList.includes(postMarkdownImage)));

            // If there are unused markdown images
            if (postMarkdownImageListUnused.length) {
              // Move the unused markdown images to the /temp
              const tempMarkdownImageListUnused: string[] = await request.server.storagePlugin
                .setImageListMove(postMarkdownImageListUnused, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for moving unused markdown images to the /images back
              requestRollback.tempMarkdownImageListUnused = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempMarkdownImageListUnused, 'images');
              };
            }

            // Define the arguments for updating post
            const postPrivateUpdateArgs: Prisma.PostPrivateUpdateArgs = {
              where: {
                id: postId,
                userFirebaseUid
              },
              data: request.body
            };

            // Return the post
            return prismaClient.postPrivate.update(postPrivateUpdateArgs);
          }).then((postPrivate: PostPrivate) => {
            // Send success response with updated post
            return reply.status(200).send({
              data: postPrivate,
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
