/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PostCreateDto } from '../../types/dto/post/post-create';
import type { Post, Prisma, PrismaClient } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { SaveObjectResponse } from '@algolia/client-search';
import type { SearchIndex } from 'algoliasearch';

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
          image: {
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
      const postCover: string | null = request.body.image;
      const postCategoryId: number = Number(request.body.categoryId);
      const postMarkdown: string = request.body.markdown;
      const postIndex: SearchIndex = request.server.algolia.initIndex('post');

      // Get the list of images in the post markdown body
      const bodyMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);
      const tempMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownImageList).filter((bodyMarkdownImage: string) => bodyMarkdownImage.startsWith('temp'));

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
              const tempCoverList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postCover]);

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

            // Define the arguments for create post
            const postCreateArgs: Prisma.PostCreateArgs = {
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
            const postIndexObject: SaveObjectResponse = await postIndex.saveObject({
              ...request.server.helperPlugin.mapObjectValuesToNull(post),
              objectID: String(post.id),
              updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(post.updatedAt),
              createdAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(post.createdAt)
            });

            //! Define rollback action for Algolia delete post object
            requestRollback.postIndexObjects = async (): Promise<void> => {
              await postIndex.deleteObjects([postIndexObject.objectID]);
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
