/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Post, PrismaClient } from '../../database/client';
import type { PostUpdateDto } from '../../types/dto/post/post-update';
import type { DocumentReference, DocumentSnapshot, DocumentData, WriteResult } from 'firebase-admin/firestore';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { SearchIndex } from 'algoliasearch';
import type { GetObjectsResponse, SaveObjectResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts'],
      description: 'Updates a Post',
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
            $ref: 'partsFirebaseUrlStorageSchema#'
          },
          categoryId: {
            $ref: 'partsIdSchema#'
          },
          firebaseUid: {
            $ref: 'partsFirebaseUidSchema#'
          }
        },
        required: ['firebaseUid']
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
    handler: async function (request: FastifyRequest<PostUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postId: number = Number(request.params.id);
      const postFirebaseUid: string = String(request.body.firebaseUid);
      const postPath: string = ['users', userFirebaseUid, 'posts', postFirebaseUid].join('/');
      const postImage: string = String(request.body.image || '');
      const postMarkdown: string = String(request.body.markdown || '');
      const postMarkdownListDestination: string = [postPath, 'markdown'].join('/');
      const postIndex: SearchIndex = request.server.algolia.initIndex('post');
      const postIndexObjects: GetObjectsResponse<any> = await postIndex.getObjects([String(postId)]);

      // Delete for more adjustable Prisma input
      delete request.body.categoryName;

      // Define an array of DocumentReference objects for the post documents in Firestore
      const postDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(postPath);

      // Retrieve the DocumentSnapshot objects for the post documents in Firestore
      // prettier-ignore
      const postDocumentSnapshot: DocumentSnapshot = await postDocumentReference
        .get()
        .catch((error: any) => request.server.helperPlugin.throwError('firestore/get-document-failed', error, request));

      // Define the arguments for find a post
      const postFindUniqueOrThrowArgs: Prisma.PostFindUniqueOrThrowArgs = {
        select: {
          image: true
        },
        where: {
          id: postId,
          userFirebaseUid
        }
      };

      // User previous state
      const post: Post = await request.server.prisma.post.findUniqueOrThrow(postFindUniqueOrThrowArgs);
      const postStorageHandler: any = {};

      // Fill the postStorageHandler if is changed an image
      if (post.image !== postImage) {
        // Create the destination path for the post image
        const postImageStorageListDestination: string = [postDocumentReference.path, 'image'].join('/');

        // Retrieve the list of post image from the storage
        // prettier-ignore
        const postImageStorageList: string[] = await request.server.storagePlugin
          .getImageList(postImageStorageListDestination)
          .catch((error: any) => request.server.helperPlugin.throwError('storage/get-filelist-failed', error, request));

        // Define a function to set the post image and move unused image to temporary storage
        const postImageStorage = async (postImageNext: string | null): Promise<string | null> => {
          // Filter out the unused post image URL
          const postImageListUnused: string[] = postImageStorageList.filter(
            (postImageStorage: string) => postImageStorage !== postImageNext
          );

          // Move the unused image to temporary storage
          const tempImageList: string[] = await request.server.storagePlugin
            .setImageListMove(postImageListUnused, 'temp')
            .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

          //! Define rollback action for post image moved to temporary storage
          requestRollback.tempImageList = async (): Promise<void> => {
            await request.server.storagePlugin.setImageListMove(tempImageList, postPath);
          };

          return postImageNext;
        };

        postStorageHandler.postImageStorageListDestination = postImageStorageListDestination;
        postStorageHandler.postImageStorageList = postImageStorageList;
        postStorageHandler.postImageStorage = postImageStorage;
      }

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

            // Check if the postStorageHandler is filled
            if (Object.keys(postStorageHandler).length) {
              // If there is a post image
              if (postImage) {
                const postImageStorage: boolean = postStorageHandler.postImageStorageList.some((postImageStorage: string) => {
                  return decodeURIComponent(postImage).includes(postImageStorage);
                });

                // Check if the post image is stored in any of the specified locations
                if (!postImageStorage) {
                  // Extract the new image URL with the appropriate destination
                  const updatedTempImageList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postImage]);

                  // Move the updated image to the post image destination
                  const updatedPostImageList: string[] = await request.server.storagePlugin
                    .setImageListMove(updatedTempImageList, postStorageHandler.postImageStorageListDestination)
                    .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

                  //! Define rollback action for moving post image to destination
                  requestRollback.updatedPostImageList = async (): Promise<void> => {
                    await request.server.storagePlugin.setImageListMove(updatedPostImageList, 'temp');
                  };

                  // Set the request body image with the updated post image
                  request.body.image = request.server.markdownPlugin.getImageListReplace(postImage, updatedTempImageList, updatedPostImageList);

                  // @ts-ignore
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const updatedPostImage: string = await postStorageHandler.postImageStorage(decodeURIComponent([...updatedPostImageList].shift()));
                }
              } else {
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const updatedPostImage: null = await postStorageHandler.postImageStorage(null);
              }
            }

            // Get the list of images in the post markdown body
            const bodyMarkdownList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);

            // Get the list of temporary images from the post markdown body
            const tempMarkdownList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownList).filter((bodyMarkdown: string) => bodyMarkdown.startsWith('temp'));

            // If there are temporary markdown images
            if (tempMarkdownList.length) {
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
            }

            // Get the updated list of markdown images from the request body
            const updatedPostMarkdown: string[] = request.server.markdownPlugin.getImageListFromBody(String(request.body.markdown || ''));

            // Extract the list of post markdown images
            const updatedPostMarkdownList: string[] = request.server.markdownPlugin.getImageListSettled(updatedPostMarkdown);

            // Filter out the post markdown images that are no longer used
            const updatedPostMarkdownListUnused: string[] = await request.server.storagePlugin
              .getImageList(postMarkdownListDestination)
              .then((imageList: string[]) => imageList.filter((imageUrl: string) => !updatedPostMarkdownList.includes(encodeURIComponent(imageUrl))))
              .catch((error: any) => request.server.helperPlugin.throwError('storage/get-filelist-failed', error, request));

            // If there are unused post markdown images
            if (updatedPostMarkdownListUnused.length) {
              // Move the unused post markdown images to temporary storage
              const updatedTempMarkdownList: string[] = await request.server.storagePlugin
                .setImageListMove(updatedPostMarkdownListUnused, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for moving unused markdown images to temporary storage
              requestRollback.updatedTempMarkdownList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(updatedTempMarkdownList, postMarkdownListDestination);
              };
            }

            //! Define rollback action for Firestore document update
            requestRollback.postDocument = async (): Promise<void> => {
              await postDocumentReference.set(postDocumentSnapshot.data() as DocumentData)
            };

            // Prepare the DTO for updating the Firestore document
            const postDocumentUpdateDto: any = {
              postId,
              markdown: updatedPostMarkdownList.map((imageUrl: string) => decodeURIComponent(imageUrl))
            };

            // Perform the update operation on the Firestore document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postDocumentUpdate: WriteResult = await postDocumentReference
              .update(postDocumentUpdateDto)
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/update-document-failed', error, request));

            // Define the arguments for updating post
            const postUpdateArgs: Prisma.PostUpdateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostSelect(),
                category: {
                  select: request.server.prismaPlugin.getCategorySelect()
                },
                user: {
                  select: {
                    ...request.server.prismaPlugin.getUserSelect(),
                    firebaseUid: true,
                    createdAt: false,
                    updatedAt: false
                  }
                }
              },
              where: {
                id: postId,
                userFirebaseUid
              },
              data: request.body
            };

            // Update the post
            const post: Post & Record<string, any> = await prismaClient.post.update(postUpdateArgs);

            // Check if there are results in the fetched post index objects
            if (postIndexObjects.results.length) {
              //! Define rollback action for Algolia update post object
              requestRollback.postIndexObjects = async (): Promise<void> => {
                await postIndex.partialUpdateObjects([...postIndexObjects.results]);
              };

              // Update object in Algolia post index object
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postIndexObject: SaveObjectResponse = await postIndex.partialUpdateObjects([{
                ...request.server.helperPlugin.mapObjectValuesToNull(post),
                objectID: String(post.id),
                updatedAt: post.updatedAt,
                updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(post.updatedAt),
                category: {
                  id: post.category.id
                }
              }]);
            }

            // Return the post
            return post;
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
