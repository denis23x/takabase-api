/** @format */

import { storageConfig } from '../../config/storage.config';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Post, PrismaClient } from '../../database/client';
import type { PostUpdateDto } from '../../types/dto/post/post-update';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { SearchIndex } from 'algoliasearch';
import type { GetObjectsResponse } from '@algolia/client-search';
import type { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts'],
      description: 'Updates the post',
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
          cover: {
            $ref: 'partsImageSchema#'
          },
          categoryId: {
            $ref: 'partsIdSchema#'
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
    // prettier-ignore
    handler: async function (request: FastifyRequest<ParamsId & PostUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the user firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postId: number = Number(request.params.id);
      const postCover: string | null = request.body.cover as any;
      const postMarkdown: string = request.body.markdown as any;
      const postIndex: SearchIndex = request.server.algolia.initIndex('post');
      const postIndexObjects: GetObjectsResponse<any> = await postIndex.getObjects([String(postId)]);

      // Get the list of images in the post markdown body
      const bodyMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);
      const tempMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownImageList).filter((bodyMarkdownImage: string) => bodyMarkdownImage.startsWith('temp'));

      // Define the arguments for find a post
      const postFindUniqueOrThrowArgs: Prisma.PostFindUniqueOrThrowArgs = {
        select: {
          cover: true,
          markdown: true
        },
        where: {
          id: postId,
          userFirebaseUid
        }
      };

      // User previous state
      const post: Post = await request.server.prisma.post.findUniqueOrThrow(postFindUniqueOrThrowArgs);

      // Counter for transaction retries
      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // Delete for more adjustable Prisma input
      delete request.body.categoryName;

      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // If there is a new cover provided
            if (postCover && postCover !== post.cover) {
              // Get the cover relative /temp URL
              const tempCoverList: string[] = request.server.markdownPlugin.getImageListFromBucket([postCover]);

              // Move the /temp cover to the /covers
              const postCoverList: string[] = await request.server.storagePlugin
                .setImageListMove(tempCoverList, storageConfig.paths.POST_COVERS)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for cover to move it to the /temp back
              requestRollback.postCoverList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postCoverList, 'temp');
              };

              // Replace the cover URL in the request body with the new URL
              request.body.cover = request.server.markdownPlugin.getImageListReplace(postCover, tempCoverList, postCoverList);
            }

            // If there is a previous cover exists
            if (postCover === null || postCover !== post.cover) {
              // Get the cover relative URL
              const postPreviousCoverList: string[] = request.server.markdownPlugin.getImageListFromBucket([post.cover]);

              // Move the previous and unworthy cover to the /temp
              const tempPreviousCoverList: string[] = await request.server.storagePlugin
                .setImageListMove(postPreviousCoverList, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for cover to move it to the /covers back
              requestRollback.tempCoverList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempPreviousCoverList, storageConfig.paths.POST_COVERS);
              };
            }

            // If there are /temp markdown images
            if (tempMarkdownImageList.length) {
              // Move the /temp markdown images to the /images
              const postMarkdownImageList: string[] = await request.server.storagePlugin
                .setImageListMove(tempMarkdownImageList, storageConfig.paths.POST_IMAGES)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for moving markdown images to the /temp back
              requestRollback.postMarkdownImageList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postMarkdownImageList, 'temp');
              };

              // Replace the markdown body with the new URL images list
              request.body.markdown = request.server.markdownPlugin.getImageListReplace(postMarkdown, tempMarkdownImageList, postMarkdownImageList);
            }

            // Get the original markdown images list
            const postMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(post.markdown);

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
                await request.server.storagePlugin.setImageListMove(tempMarkdownImageListUnused, storageConfig.paths.POST_IMAGES);
              };
            }

            // Define the arguments for updating post
            const postUpdateArgs: Prisma.PostUpdateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostSelect(),
                markdown: true
              },
              where: {
                id: postId,
                userFirebaseUid
              },
              data: request.body
            };

            // Update the post
            const postNext: Post = await prismaClient.post.update(postUpdateArgs);

            // Check if there are results in the fetched post index objects
            if (postIndexObjects.results.length) {
              //! Define rollback action for Algolia update post object
              requestRollback.postIndexObjects = async (): Promise<void> => {
                await postIndex.partialUpdateObjects([...postIndexObjects.results]);
              };

              // Update object in Algolia post index object
              await postIndex.partialUpdateObjects([{
                ...request.server.helperPlugin.mapObjectValuesToNull(postNext),
                objectID: String(postNext.id),
                updatedAt: postNext.updatedAt,
                updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(postNext.updatedAt)
              }]);
            }

            // Return the post
            return postNext;
          }).then((post: Post) => {
            // Send success response with updated post
            return reply.status(200).send({
              data: post,
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
