/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PostPrivateCreateDto } from '../../types/dto/post-private/post-private-create';
import { DocumentReference } from 'firebase-admin/firestore';
import { PostPrivate, Prisma, PrismaClient } from '../../database/client';
import { WriteResult } from 'firebase-admin/lib/firestore';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Private'],
      description: 'Creates a new Private',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      body: {
        type: 'object',
        properties: {
          name: {
            $ref: 'partsPostPrivateNameSchema#'
          },
          description: {
            $ref: 'partsPostPrivateDescriptionSchema#'
          },
          markdown: {
            $ref: 'partsPostPrivateMarkdownSchema#'
          },
          image: {
            $ref: 'partsFirebaseUrlStorageSchema#'
          }
        },
        required: ['name', 'description', 'markdown']
      },
      response: {
        '201': {
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
    handler: async function (request: FastifyRequest<PostPrivateCreateDto>, reply: FastifyReply): Promise<void> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postPrivatePath: string = ['users', userFirebaseUid, 'posts-private'].join('/');
      const postPrivateImage: string | null | undefined = request.body.image;
      const postPrivateMarkdown: string = request.body.markdown;

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

            // Create a reference for the new post document in Firestore
            const postPrivateDocumentReference: DocumentReference = await request.server.firestorePlugin
              .addDocument(postPrivatePath, {})
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/add-document-failed', error, request));

            // Prepare the DTO for updating the Firestore document
            const postPrivateDocumentUpdateDto: any = {};

            //! Define the rollback action for deleting the newly created post document in Firestore
            requestRollback.postPrivateDocument = async (): Promise<void> => {
              await postPrivateDocumentReference.delete();
            };

            // If there is an image associated with the post
            if (postPrivateImage) {
              // Prepare the post image temporary URL
              const tempImageList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postPrivateImage]);

              // Define the destination path for the post image in storage
              const postPrivateImageListDestination: string = [postPrivateDocumentReference.path, 'image'].join('/');

              // Move the temporary post image to the post image destination
              const postPrivateImageList: string[] = await request.server.storagePlugin
                .setImageListMove(tempImageList, postPrivateImageListDestination)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for post image moved to the post image destination
              requestRollback.postPrivateImageList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postPrivateImageList, 'temp');
              };

              // Rewrite the image URL in the request body with the new post image URL
              request.body.image = request.server.markdownPlugin.getImageListRewrite(postPrivateImage, tempImageList, postPrivateImageList);
            }

            // Get the list of images in the post markdown body
            const bodyMarkdownList: string[] = request.server.markdownPlugin.getImageList(postPrivateMarkdown);

            // Get the list of temporary images from the post markdown body
            const tempMarkdownList: string[] = request.server.markdownPlugin.getImageListTemp(bodyMarkdownList);

            // If there are temporary markdown images
            if (tempMarkdownList.length) {
              // Define the destination path for the post markdown images in storage
              const postPrivateMarkdownListDestination: string = [postPrivateDocumentReference.path, 'markdown'].join('/');

              // Move the temporary markdown images to the post markdown destination
              const postPrivateMarkdownList: string[] = await request.server.storagePlugin
                .setImageListMove(tempMarkdownList, postPrivateMarkdownListDestination)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for moving markdown images to post markdown destination
              requestRollback.postPrivateMarkdownList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postPrivateMarkdownList, 'temp');
              };

              // Rewrite the markdown body with the updated markdown image list
              request.body.markdown = request.server.markdownPlugin.getImageListRewrite(postPrivateMarkdown, tempMarkdownList, postPrivateMarkdownList);

              // Update the DTO for updating the Firestore document
              postPrivateDocumentUpdateDto.markdown = postPrivateMarkdownList.map((imageUrl: string) => decodeURIComponent(imageUrl));
            }

            // Define the arguments for create post
            const postPrivateCreateArgs: Prisma.PostPrivateCreateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostPrivateSelect(),
                user: {
                  select: request.server.prismaPlugin.getUserSelect()
                }
              },
              data: {
                ...request.body,
                firebaseUid: postPrivateDocumentReference.id,
                user: {
                  connect: {
                    firebaseUid: userFirebaseUid
                  }
                }
              }
            };

            // Create the post
            const postPrivate: PostPrivate & Record<string, any> = await prismaClient.postPrivate.create(postPrivateCreateArgs);

            //! Define rollback action for delete post row
            requestRollback.postPrivate = async (): Promise<void> => {
              // Define arguments to delete post
              const postPrivateDeleteArgs: Prisma.PostPrivateDeleteArgs = {
                where: {
                  id: postPrivate.id,
                  userFirebaseUid
                }
              };

              // Delete post
              await prismaClient.postPrivate.delete(postPrivateDeleteArgs);
            }

            // Update the DTO for updating the Firestore document
            postPrivateDocumentUpdateDto.postPrivateId = postPrivate.id;

            // Perform the update operation on the Firestore document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postPrivateDocumentUpdate: WriteResult = await postPrivateDocumentReference
              .update(postPrivateDocumentUpdateDto)
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/update-document-failed', error, request));

            // Return the post
            return postPrivate;
          }).then((postPrivate: PostPrivate) => {
            // Send success response with created post
            return reply.status(201).send({
              data: postPrivate,
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
