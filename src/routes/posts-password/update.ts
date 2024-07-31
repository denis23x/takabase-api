/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PostPassword, PrismaClient } from '../../database/client';
import type { DocumentReference, DocumentSnapshot, DocumentData, WriteResult } from 'firebase-admin/firestore';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { PostUpdateDto } from '../../types/dto/post/post-update';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Password'],
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
          password: {
            $ref: 'partsPasswordSchema#'
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
    handler: async function (request: FastifyRequest<PostUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postPasswordId: number = Number(request.params.id);
      const postPasswordFirebaseUid: string = String(request.body.firebaseUid);
      const postPasswordPath: string = ['users', userFirebaseUid, 'posts-password', postPasswordFirebaseUid].join('/');
      const postPasswordImage: string = String(request.body.image || '');
      const postPasswordMarkdown: string = String(request.body.markdown || '');
      const postPasswordMarkdownListDestination: string = [postPasswordPath, 'markdown'].join('/');

      // Define an array of DocumentReference objects for the post documents in Firestore
      // prettier-ignore
      const postPasswordDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(postPasswordPath);

      // Retrieve the DocumentSnapshot objects for the post documents in Firestore
      // prettier-ignore
      const postPasswordDocumentSnapshot: DocumentSnapshot = await postPasswordDocumentReference
        .get()
        .catch((error: any) => request.server.helperPlugin.throwError('firestore/get-document-failed', error, request));

      // Define the arguments for find a post
      const postPasswordFindUniqueOrThrowArgs: Prisma.PostPasswordFindUniqueOrThrowArgs = {
        select: {
          image: true
        },
        where: {
          id: postPasswordId,
          userFirebaseUid
        }
      };

      // prettier-ignore
      const postPassword: PostPassword = await request.server.prisma.postPassword.findUniqueOrThrow(postPasswordFindUniqueOrThrowArgs);
      const postPasswordStorageHandler: any = {};

      // Fill the postStorageHandler if is changed an image
      if (postPassword.image !== postPasswordImage) {
        // Create the destination path for the post image
        const postPasswordImageStorageListDestination: string = [postPasswordDocumentReference.path, 'image'].join('/');

        // Retrieve the list of post image from the storage
        // prettier-ignore
        const postPasswordImageStorageList: string[] = await request.server.storagePlugin
          .getImageList(postPasswordImageStorageListDestination)
          .catch((error: any) => request.server.helperPlugin.throwError('storage/get-filelist-failed', error, request));

        // Define a function to set the post image and move unused image to temporary storage
        const postPasswordImageStorage = async (postPasswordImageNext: string | null): Promise<string | null> => {
          // prettier-ignore
          const postPasswordImageListUnused: string[] = postPasswordImageStorageList.filter((postPasswordImageStorage: string) => {
            return postPasswordImageStorage !== postPasswordImageNext;
          });

          // Move the unused image to temporary storage
          const tempImageList: string[] = await request.server.storagePlugin
            .setImageListMove(postPasswordImageListUnused, 'temp')
            .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

          //! Define rollback action for post image moved to temporary storage
          requestRollback.tempImageList = async (): Promise<void> => {
            await request.server.storagePlugin.setImageListMove(tempImageList, postPasswordPath);
          };

          return postPasswordImageNext;
        };

        postPasswordStorageHandler.postPasswordImageStorageListDestination = postPasswordImageStorageListDestination;
        postPasswordStorageHandler.postPasswordImageStorageList = postPasswordImageStorageList;
        postPasswordStorageHandler.postPasswordImageStorage = postPasswordImageStorage;
      }

      // Counter for transaction retries
      let requestRetries: number = 0;

      // Object to store rollback actions in case of transaction failure
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<PostPassword> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // Check if the postStorageHandler is filled
            if (Object.keys(postPasswordStorageHandler).length) {
              // If there is a post image
              if (postPasswordImage) {
                const postPasswordImageStorage: boolean = postPasswordStorageHandler.postPasswordImageStorageList.some((postPasswordImageStorage: string) => {
                  return decodeURIComponent(postPasswordImage).includes(postPasswordImageStorage);
                });

                // Check if the post image is stored in any of the specified locations
                if (!postPasswordImageStorage) {
                  // Extract the new image URL with the appropriate destination
                  const updatedTempImageList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postPasswordImage]);

                  // Move the updated image to the post image destination
                  const updatedPostImageList: string[] = await request.server.storagePlugin
                    .setImageListMove(updatedTempImageList, postPasswordStorageHandler.postPasswordImageStorageListDestination)
                    .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

                  //! Define rollback action for moving post image to destination
                  requestRollback.updatedPostImageList = async (): Promise<void> => {
                    await request.server.storagePlugin.setImageListMove(updatedPostImageList, 'temp');
                  };

                  // Set the request body image with the updated post image
                  request.body.image = request.server.markdownPlugin.getImageListRewrite(postPasswordImage, updatedTempImageList, updatedPostImageList);

                  // @ts-ignore
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const updatedPostImage: string = await postPasswordStorageHandler.postPasswordImageStorage(decodeURIComponent([...updatedPostImageList].shift()));
                }
              } else {
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const updatedPostImage: null = await postPasswordStorageHandler.postPasswordImageStorage(null);
              }
            }

            // Get the list of images in the post markdown body
            const bodyMarkdownList: string[] = request.server.markdownPlugin.getImageList(postPasswordMarkdown);

            // Get the list of temporary images from the post markdown body
            const tempMarkdownList: string[] = request.server.markdownPlugin.getImageListTemp(bodyMarkdownList);

            // If there are temporary markdown images
            if (tempMarkdownList.length) {
              // Move the temporary markdown images to the post markdown destination
              const postPasswordMarkdownList: string[] = await request.server.storagePlugin
                .setImageListMove(tempMarkdownList, postPasswordMarkdownListDestination)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for moving markdown images to post markdown destination
              requestRollback.postPasswordMarkdownList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postPasswordMarkdownList, 'temp');
              };

              // Rewrite the markdown body with the updated markdown image list
              request.body.markdown = request.server.markdownPlugin.getImageListRewrite(postPasswordMarkdown, tempMarkdownList, postPasswordMarkdownList);
            }

            // Get the updated list of markdown images from the request body
            const updatedPostMarkdown: string[] = request.server.markdownPlugin.getImageList(String(request.body.markdown || ''));

            // Extract the list of post markdown images
            const updatedPostMarkdownList: string[] = request.server.markdownPlugin.getImageListPost(updatedPostMarkdown);

            // Filter out the post markdown images that are no longer used
            const updatedPostMarkdownListUnused: string[] = await request.server.storagePlugin
              .getImageList(postPasswordMarkdownListDestination)
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
                await request.server.storagePlugin.setImageListMove(updatedTempMarkdownList, postPasswordMarkdownListDestination);
              };
            }

            //! Define rollback action for Firestore document update
            requestRollback.postPasswordDocument = async (): Promise<void> => {
              await postPasswordDocumentReference.set(postPasswordDocumentSnapshot.data() as DocumentData)
            };

            // Prepare the DTO for updating the Firestore document
            const postPasswordDocumentUpdateDto: any = {
              postPasswordId,
              markdown: updatedPostMarkdownList.map((imageUrl: string) => decodeURIComponent(imageUrl))
            };

            // Perform the update operation on the Firestore document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postPasswordDocumentUpdate: WriteResult = await postPasswordDocumentReference
              .update(postPasswordDocumentUpdateDto)
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/update-document-failed', error, request));

            // Define the arguments for updating post
            const postPasswordUpdateArgs: Prisma.PostPasswordUpdateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostPasswordSelect(),
                user: {
                  select: request.server.prismaPlugin.getUserSelect()
                }
              },
              where: {
                id: postPasswordId,
                userFirebaseUid
              },
              data: request.body
            };

            // Return the post
            return prismaClient.postPassword.update(postPasswordUpdateArgs);
          }).then((postPassword: PostPassword) => {
            // Send success response with updated post
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
