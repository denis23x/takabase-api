/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PostPrivate, PrismaClient } from '../../database/client';
import type { DocumentReference, DocumentSnapshot, DocumentData, WriteResult } from 'firebase-admin/firestore';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { PostUpdateDto } from '../../types/dto/post/post-update';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Private'],
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
    handler: async function (request: FastifyRequest<PostUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postPrivateId: number = Number(request.params.id);
      const postPrivateFirebaseUid: string = String(request.body.firebaseUid);
      const postPrivatePath: string = ['users', userFirebaseUid, 'posts-private', postPrivateFirebaseUid].join('/');
      const postPrivateImage: string = String(request.body.image || '');
      const postPrivateMarkdown: string = String(request.body.markdown || '');
      const postPrivateMarkdownListDestination: string = [postPrivatePath, 'markdown'].join('/');

      // Define an array of DocumentReference objects for the post documents in Firestore
      // prettier-ignore
      const postPrivateDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(postPrivatePath);

      // Retrieve the DocumentSnapshot objects for the post documents in Firestore
      // prettier-ignore
      const postPrivateDocumentSnapshot: DocumentSnapshot = await postPrivateDocumentReference
        .get()
        .catch((error: any) => request.server.helperPlugin.throwError('firestore/get-document-failed', error, request));

      // Define the arguments for find a post
      const postPrivateFindUniqueOrThrowArgs: Prisma.PostPrivateFindUniqueOrThrowArgs = {
        select: {
          image: true
        },
        where: {
          id: postPrivateId,
          userFirebaseUid
        }
      };

      // prettier-ignore
      const postPrivate: PostPrivate = await request.server.prisma.postPrivate.findUniqueOrThrow(postPrivateFindUniqueOrThrowArgs);
      const postPrivateStorageHandler: any = {};

      // Fill the postStorageHandler if is changed an image
      if (postPrivate.image !== postPrivateImage) {
        // Create the destination path for the post image
        const postPrivateImageStorageListDestination: string = [postPrivateDocumentReference.path, 'image'].join('/');

        // Retrieve the list of post image from the storage
        // prettier-ignore
        const postPrivateImageStorageList: string[] = await request.server.storagePlugin
          .getImageList(postPrivateImageStorageListDestination)
          .catch((error: any) => request.server.helperPlugin.throwError('storage/get-filelist-failed', error, request));

        // Define a function to set the post image and move unused image to temporary storage
        const postPrivateImageStorage = async (postPrivateImageNext: string | null): Promise<string | null> => {
          // prettier-ignore
          const postPrivateImageListUnused: string[] = postPrivateImageStorageList.filter((postPrivateImageStorage: string) => {
            return postPrivateImageStorage !== postPrivateImageNext;
          });

          // Move the unused image to temporary storage
          const tempImageList: string[] = await request.server.storagePlugin
            .setImageListMove(postPrivateImageListUnused, 'temp')
            .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

          //! Define rollback action for post image moved to temporary storage
          requestRollback.tempImageList = async (): Promise<void> => {
            await request.server.storagePlugin.setImageListMove(tempImageList, postPrivatePath);
          };

          return postPrivateImageNext;
        };

        postPrivateStorageHandler.postPrivateImageStorageListDestination = postPrivateImageStorageListDestination;
        postPrivateStorageHandler.postPrivateImageStorageList = postPrivateImageStorageList;
        postPrivateStorageHandler.postPrivateImageStorage = postPrivateImageStorage;
      }

      // Counter for transaction retries
      let requestRetries: number = 0;

      // Object to store rollback actions in case of transaction failure
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<PostPrivate> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // Check if the postStorageHandler is filled
            if (Object.keys(postPrivateStorageHandler).length) {
              // If there is a post image
              if (postPrivateImage) {
                const postPrivateImageStorage: boolean = postPrivateStorageHandler.postPrivateImageStorageList.some((postPrivateImageStorage: string) => {
                  return decodeURIComponent(postPrivateImage).includes(postPrivateImageStorage);
                });

                // Check if the post image is stored in any of the specified locations
                if (!postPrivateImageStorage) {
                  // Extract the new image URL with the appropriate destination
                  const updatedTempImageList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postPrivateImage]);

                  // Move the updated image to the post image destination
                  const updatedPostImageList: string[] = await request.server.storagePlugin
                    .setImageListMove(updatedTempImageList, postPrivateStorageHandler.postPrivateImageStorageListDestination)
                    .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

                  //! Define rollback action for moving post image to destination
                  requestRollback.updatedPostImageList = async (): Promise<void> => {
                    await request.server.storagePlugin.setImageListMove(updatedPostImageList, 'temp');
                  };

                  // Set the request body image with the updated post image
                  request.body.image = request.server.markdownPlugin.getImageListReplace(postPrivateImage, updatedTempImageList, updatedPostImageList);

                  // @ts-ignore
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const updatedPostImage: string = await postPrivateStorageHandler.postPrivateImageStorage(decodeURIComponent([...updatedPostImageList].shift()));
                }
              } else {
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const updatedPostImage: null = await postPrivateStorageHandler.postPrivateImageStorage(null);
              }
            }

            // Get the list of images in the post markdown body
            const bodyMarkdownList: string[] = request.server.markdownPlugin.getImageListFromBody(postPrivateMarkdown);

            // Get the list of temporary images from the post markdown body
            const tempMarkdownList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownList).filter((bodyMarkdown: string) => bodyMarkdown.startsWith('temp'));

            // If there are temporary markdown images
            if (tempMarkdownList.length) {
              // Move the temporary markdown images to the post markdown destination
              const postPrivateMarkdownList: string[] = await request.server.storagePlugin
                .setImageListMove(tempMarkdownList, postPrivateMarkdownListDestination)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for moving markdown images to post markdown destination
              requestRollback.postPrivateMarkdownList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postPrivateMarkdownList, 'temp');
              };

              // Rewrite the markdown body with the updated markdown image list
              request.body.markdown = request.server.markdownPlugin.getImageListReplace(postPrivateMarkdown, tempMarkdownList, postPrivateMarkdownList);
            }

            // Get the updated list of markdown images from the request body
            const updatedPostMarkdown: string[] = request.server.markdownPlugin.getImageListFromBody(String(request.body.markdown || ''));

            // Extract the list of post markdown images
            const updatedPostMarkdownList: string[] = request.server.markdownPlugin.getImageListSettled(updatedPostMarkdown);

            // Filter out the post markdown images that are no longer used
            const updatedPostMarkdownListUnused: string[] = await request.server.storagePlugin
              .getImageList(postPrivateMarkdownListDestination)
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
                await request.server.storagePlugin.setImageListMove(updatedTempMarkdownList, postPrivateMarkdownListDestination);
              };
            }

            //! Define rollback action for Firestore document update
            requestRollback.postPrivateDocument = async (): Promise<void> => {
              await postPrivateDocumentReference.set(postPrivateDocumentSnapshot.data() as DocumentData)
            };

            // Prepare the DTO for updating the Firestore document
            const postPrivateDocumentUpdateDto: any = {
              postPrivateId,
              markdown: updatedPostMarkdownList.map((imageUrl: string) => decodeURIComponent(imageUrl))
            };

            // Perform the update operation on the Firestore document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postPrivateDocumentUpdate: WriteResult = await postPrivateDocumentReference
              .update(postPrivateDocumentUpdateDto)
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/update-document-failed', error, request));

            // Define the arguments for updating post
            const postPrivateUpdateArgs: Prisma.PostPrivateUpdateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostPrivateSelect(),
                user: {
                  select: request.server.prismaPlugin.getUserSelect()
                }
              },
              where: {
                id: postPrivateId,
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
