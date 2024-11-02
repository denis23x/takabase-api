/** @format */

import { parse } from 'path';
import { storageConfig } from '../../config/storage.config';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PostCreateDto } from '../../types/dto/post/post-create';
import type { Post, Prisma, PrismaClient } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { SaveObjectResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts'],
      description: 'Creates a new post',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
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
        },
        required: ['name', 'description', 'markdown', 'categoryId']
      },
      response: {
        '201': {
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
    handler: async function (request: FastifyRequest<PostCreateDto>, reply: FastifyReply): Promise<void> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the user firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postCover: string | null = request.body.cover;
      const postCategoryId: number = Number(request.body.categoryId);
      const postMarkdown: string = request.body.markdown;

      // Get the list of images in the post markdown body
      const bodyMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);
      const tempMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownImageList);

      // Delete for more adjustable Prisma input
      delete request.body.categoryId;
      delete request.body.categoryName;

      // Counter for transaction retries
      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // If there is a cover provided
            if (postCover) {
              // Get the cover relative /temp URL
              const tempCoverList: string[] = request.server.markdownPlugin.getImageListFromBucket([postCover]);

              // Checking to avoid unnecessary move when changing post type
              if (tempCoverList.some((tempCover: string) => !tempCover.startsWith(storageConfig.paths.POST_COVERS))) {
                // Move the /temp cover to the /covers
                const postCoverList: string[] = await request.server.storagePlugin
                  .setImageListMove(tempCoverList, storageConfig.paths.POST_COVERS)
                  .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error));

                //! Define rollback action for cover to move it to the /temp back
                requestRollback.postCoverList = async (): Promise<void> => {
                  // Get the original destination for rollback
                  await request.server.storagePlugin.setImageListMove(postCoverList, tempCoverList.map((tempCover: string) => parse(tempCover).dir).shift());
                };

                // Replace the cover URL in the request body with the new URL
                request.body.cover = postCover.replace(tempCoverList.shift(), postCoverList.shift());
              }
            }

            // If there are /temp markdown images
            if (tempMarkdownImageList.length) {
              // Checking to avoid unnecessary move when changing post type
              if (tempMarkdownImageList.some((tempMarkdownImage: string) => !tempMarkdownImage.startsWith(storageConfig.paths.POST_IMAGES))) {
                // Move the /temp markdown images to the /images
                const postMarkdownImageList: string[] = await request.server.storagePlugin
                  .setImageListMove(tempMarkdownImageList, storageConfig.paths.POST_IMAGES)
                  .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error));

                //! Define rollback action for moving markdown images to the /temp back
                requestRollback.postMarkdownImageList = async (): Promise<void> => {
                  // Get the original destination for rollback
                  await request.server.storagePlugin.setImageListMove(postMarkdownImageList, tempMarkdownImageList.map((tempImage: string) => parse(tempImage).dir).shift());
                };

                // Replace the markdown body with the new URL images list
                request.body.markdown = request.server.markdownPlugin.getImageListReplace(postMarkdown, bodyMarkdownImageList, postMarkdownImageList);
              }
            }

            // Define the arguments for create post
            const postCreateArgs: Prisma.PostCreateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostSelect(),
                markdown: true
              },
              data: {
                ...request.body,
                user: {
                  connect: {
                    firebaseUid: userFirebaseUid
                  }
                },
                category: {
                  connect: {
                    id: postCategoryId
                  }
                }
              }
            };

            // Create the post
            const post: Post = await prismaClient.post.create(postCreateArgs);

            //! Define rollback action for delete post
            requestRollback.post = async (): Promise<void> => {
              // Define arguments to delete post
              const postDeleteArgs: Prisma.PostDeleteArgs = {
                where: {
                  id: post.id,
                  userFirebaseUid
                }
              };

              // Delete post
              await prismaClient.post.delete(postDeleteArgs);
            }

            // Create new object in Algolia post index
            const postIndexObject: SaveObjectResponse = await request.server.algolia.saveObject({
              indexName: 'post',
              body: {
                ...request.server.helperPlugin.mapObjectValuesToNull(post),
                objectID: String(post.id),
                updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(post.updatedAt),
                createdAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(post.createdAt)
              }
            });

            //! Define rollback action for Algolia delete post object
            requestRollback.postIndexObjects = async (): Promise<void> => {
              await request.server.algolia.deleteObject({
                indexName: 'post',
                objectID: postIndexObject.objectID
              });
            };

            // Return the post
            return post;
          }).then((post: Post) => {
            // Send success response with created post
            return reply.status(201).send({
              data: post,
              statusCode: 201
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
