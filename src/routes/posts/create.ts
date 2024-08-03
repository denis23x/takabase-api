/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PostCreateDto } from '../../types/dto/post/post-create';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { Post, Prisma, PrismaClient } from '../../database/client';
import type { WriteResult } from 'firebase-admin/lib/firestore';
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
      description: 'Creates a new Post',
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
            $ref: 'partsFirebaseUrlStorageSchema#'
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
    handler: async function (request: FastifyRequest<PostCreateDto>, reply: FastifyReply): Promise<void> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postPath: string = ['users', userFirebaseUid, 'posts'].join('/');
      const postImage: string | null | undefined = request.body.image;
      const postCategoryId: number = Number(request.body.categoryId);
      const postMarkdown: string = request.body.markdown;
      const postIndex: SearchIndex = request.server.algolia.initIndex('post');

      // Delete for more adjustable Prisma input
      delete request.body.categoryId;

      // Counter for transaction retries
      let requestRetries: number = 0;

      // Object to store rollback actions in case of transaction failure
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // Create a reference for the new post document in Firestore
            const postDocumentReference: DocumentReference = await request.server.firestorePlugin
              .addDocument(postPath, {})
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/add-document-failed', error, request));

            // Prepare the DTO for updating the Firestore document
            const postDocumentUpdateDto: any = {};

            //! Define the rollback action for deleting the newly created post document in Firestore
            requestRollback.postDocument = async (): Promise<void> => {
              await postDocumentReference.delete();
            };

            // If there is an image associated with the post
            if (postImage) {
              // Prepare the post image temporary URL
              const tempImageList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postImage]);

              // Define the destination path for the post image in storage
              const postImageListDestination: string = [postDocumentReference.path, 'image'].join('/');

              // Move the temporary post image to the post image destination
              const postImageList: string[] = await request.server.storagePlugin
                .setImageListMove(tempImageList, postImageListDestination)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for post image moved to the post image destination
              requestRollback.postImageList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postImageList, 'temp');
              };

              // Rewrite the image URL in the request body with the new post image URL
              request.body.image = request.server.markdownPlugin.getImageListReplace(postImage, tempImageList, postImageList);
            }

            // Get the list of images in the post markdown body
            const bodyMarkdownList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);

            // Get the list of temporary images from the post markdown body
            const tempMarkdownList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownList);

            // If there are temporary markdown images
            if (tempMarkdownList.length) {
              // Define the destination path for the post markdown images in storage
              const postMarkdownListDestination: string = [postDocumentReference.path, 'markdown'].join('/');

              // Move the temporary markdown images to the post markdown destination
              const postMarkdownList: string[] = await request.server.storagePlugin
                .setImageListMove(tempMarkdownList, postMarkdownListDestination)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for moving markdown images to post markdown destination
              requestRollback.postMarkdownList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postMarkdownList, 'temp');
              };

              // Rewrite the markdown body with the updated markdown image list
              request.body.markdown = request.server.markdownPlugin.getImageListReplace(postMarkdown, tempMarkdownList, postMarkdownList);

              // Update the DTO for updating the Firestore document
              postDocumentUpdateDto.markdown = postMarkdownList.map((imageUrl: string) => decodeURIComponent(imageUrl));
            }

            // Define the arguments for create post
            const postCreateArgs: Prisma.PostCreateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostSelect(),
                category: {
                  select: request.server.prismaPlugin.getCategorySelect()
                },
                user: {
                  select: request.server.prismaPlugin.getUserSelect()
                }
              },
              data: {
                ...request.body,
                firebaseUid: postDocumentReference.id,
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
            const post: Post & Record<string, any> = await prismaClient.post.create(postCreateArgs);

            //! Define rollback action for delete post row
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

            // Update the DTO for updating the Firestore document
            postDocumentUpdateDto.postId = post.id;

            // Perform the update operation on the Firestore document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postDocumentUpdate: WriteResult = await postDocumentReference
              .update(postDocumentUpdateDto)
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/update-document-failed', error, request));

            // Create new object in Algolia post index
            const postIndexObject: SaveObjectResponse = await postIndex.saveObject({
              ...request.server.helperPlugin.mapObjectValuesToNull(post),
              objectID: String(post.id),
              updatedAtUnixTimestamp: request.server.algoliaPlugin.getUnixTimestamp(post.updatedAt),
              createdAtUnixTimestamp: request.server.algoliaPlugin.getUnixTimestamp(post.createdAt),
              user: {
                id: post.user.id,
                avatar: post.user.avatar,
                name: post.user.name,
              },
              category: {
                id: post.category.id
              },
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
