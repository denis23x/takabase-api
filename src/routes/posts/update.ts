/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post, PrismaClient } from '../../database/client';
import { PostUpdateDto } from '../../types/dto/post/post-update';
import { DocumentReference, DocumentSnapshot, DocumentData, WriteResult } from 'firebase-admin/firestore';
import { ResponseError } from '../../types/crud/response/response-error.schema';

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
            oneOf: [
              {
                type: 'null'
              },
              {
                $ref: 'partsFirebaseUrlStorageSchema#'
              }
            ]
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
        200: {
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
        400: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<PostUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract common information from request object
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postId: number = Number(request.params.id);
      const postFirebaseUid: string = String(request.body.firebaseUid);
      const postPath: string = ['users', userFirebaseUid, 'posts', postFirebaseUid].join('/');
      const postImage: string | null | undefined = request.body.image as any;
      const postMarkdown: string = String(request.body.markdown || '');
      const postMarkdownListDestination: string = [postPath, 'markdown'].join('/');

      // Define an array of DocumentReference objects for the post documents in Firestore
      const postDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(postPath);

      // Retrieve the DocumentSnapshot objects for the post documents in Firestore
      // prettier-ignore
      const postDocumentSnapshot: DocumentSnapshot = await postDocumentReference
        .get()
        .catch((error: any) => request.server.helperPlugin.throwError('firestore/get-document-failed', error, request));

      // Create the destination path for the post image
      const postImageStorageListDestination: string = [postDocumentReference.path, 'image'].join('/');

      // Retrieve the list of post image from the storage
      // prettier-ignore
      const postImageStorageList: string[] = await request.server.storagePlugin
        .getImageList(postImageStorageListDestination)
        .catch((error: any) => request.server.helperPlugin.throwError('storage/get-filelist-failed', error, request));

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

            // Define a function to set the post image and move unused image to temporary storage
            const setPostImage = async (postImageNext: string | null): Promise<string | null> => {
              // Filter out the unused post image URL
              const postImageListUnused: string[] = postImageStorageList.filter((postImageStorage: string) => postImageStorage !== postImageNext);

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

            // If there is a post image
            if (postImage) {
              const postImageStorage: boolean = postImageStorageList.some((postImageStorage: string) => {
                return decodeURIComponent(postImage).includes(postImageStorage);
              });

              // Check if the post image is stored in any of the specified locations
              if (!postImageStorage) {
                // Extract the new image URL with the appropriate destination
                const updatedTempImageList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postImage]);

                // Move the updated image to the post image destination
                const updatedPostImageList: string[] = await request.server.storagePlugin
                  .setImageListMove(updatedTempImageList, postImageStorageListDestination)
                  .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

                //! Define rollback action for moving post image to destination
                requestRollback.updatedPostImageList = async (): Promise<void> => {
                  await request.server.storagePlugin.setImageListMove(updatedPostImageList, 'temp');
                };

                // Set the request body image with the updated post image
                request.body.image = request.server.markdownPlugin.getImageListRewrite(postImage, updatedTempImageList, updatedPostImageList);

                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const updatedPostImage: string = await setPostImage(decodeURIComponent([...updatedPostImageList].shift()));
              }
            } else {
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const updatedPostImage: null = await setPostImage(null);
            }

            // Get the list of images in the post markdown body
            const bodyMarkdownList: string[] = request.server.markdownPlugin.getImageList(postMarkdown);

            // Get the list of temporary images from the post markdown body
            const tempMarkdownList: string[] = request.server.markdownPlugin.getImageListTemp(bodyMarkdownList);

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
              request.body.markdown = request.server.markdownPlugin.getImageListRewrite(postMarkdown, tempMarkdownList, postMarkdownList);
            }

            // Get the updated list of markdown images from the request body
            const updatedPostMarkdown: string[] = request.server.markdownPlugin.getImageList(String(request.body.markdown || ''));

            // Extract the list of post markdown images
            const updatedPostMarkdownList: string[] = request.server.markdownPlugin.getImageListPost(updatedPostMarkdown);

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
                  select: request.server.prismaPlugin.getUserSelect()
                }
              },
              where: {
                id: postId,
                user: {
                  firebaseUid: userFirebaseUid
                }
              },
              data: request.body
            };

            // Update the post
            return prismaClient.post.update(postUpdateArgs)
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
