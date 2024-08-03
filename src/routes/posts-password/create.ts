/** @format */

import { parse } from 'path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { PostPassword, Prisma, PrismaClient } from '../../database/client';
import type { WriteResult } from 'firebase-admin/lib/firestore';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { PostCreateDto } from '../../types/dto/post/post-create';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Password'],
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
          }
        },
        required: ['name', 'description', 'markdown', 'password']
      },
      response: {
        '201': {
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
    handler: async function (request: FastifyRequest<PostCreateDto>, reply: FastifyReply): Promise<void> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postPasswordPath: string = ['users', userFirebaseUid, 'posts-password'].join('/');
      const postPasswordImage: string | null | undefined = request.body.image;
      const postPasswordMarkdown: string = request.body.markdown;

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

            // Create a reference for the new post document in Firestore
            const postPasswordDocumentReference: DocumentReference = await request.server.firestorePlugin
              .addDocument(postPasswordPath, {})
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/add-document-failed', error, request));

            // Prepare the DTO for updating the Firestore document
            const postPasswordDocumentUpdateDto: any = {};

            //! Define the rollback action for deleting the newly created post document in Firestore
            requestRollback.postPasswordDocument = async (): Promise<void> => {
              await postPasswordDocumentReference.delete();
            };

            // If there is an image associated with the post
            if (postPasswordImage) {
              // Prepare the post image temporary URL
              const tempImageList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postPasswordImage]);

              // Define the destination path for the post image in storage
              const postPasswordImageListDestination: string = [postPasswordDocumentReference.path, 'image'].join('/');

              // Move the temporary post image to the post image destination
              const postPasswordImageList: string[] = await request.server.storagePlugin
                .setImageListMove(tempImageList, postPasswordImageListDestination)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              // Get the temporary image original destination for rollback
              const tempImageListDestination: string[] = tempImageList.map((tempImag: string) => {
                return encodeURIComponent(parse(decodeURIComponent(tempImag)).dir);
              });

              //! Define rollback action for post image moved to the post image destination
              requestRollback.postPasswordImageList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postPasswordImageList, tempImageListDestination.shift());
              };

              // Rewrite the image URL in the request body with the new post image URL
              request.body.image = request.server.markdownPlugin.getImageListReplace(postPasswordImage, tempImageList, postPasswordImageList);
            }

            // Get the list of images in the post markdown body
            const bodyMarkdownList: string[] = request.server.markdownPlugin.getImageListFromBody(postPasswordMarkdown);

            // Get the list of temporary images from the post markdown body
            const tempMarkdownList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownList);

            // If there are temporary markdown images
            if (tempMarkdownList.length) {
              // Define the destination path for the post markdown images in storage
              const postPasswordMarkdownListDestination: string = [postPasswordDocumentReference.path, 'markdown'].join('/');

              // Move the temporary markdown images to the post markdown destination
              const postPasswordMarkdownList: string[] = await request.server.storagePlugin
                .setImageListMove(tempMarkdownList, postPasswordMarkdownListDestination)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              // Get the temporary markdown images original destination for rollback
              const tempMarkdownListDestination: string[] = tempMarkdownList.map((tempImag: string) => {
                return encodeURIComponent(parse(decodeURIComponent(tempImag)).dir);
              });

              //! Define rollback action for moving markdown images to post markdown destination
              requestRollback.postPasswordMarkdownList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(postPasswordMarkdownList, tempMarkdownListDestination.shift());
              };

              // Rewrite the markdown body with the updated markdown image list
              request.body.markdown = request.server.markdownPlugin.getImageListReplace(postPasswordMarkdown, tempMarkdownList, postPasswordMarkdownList);

              // Update the DTO for updating the Firestore document
              postPasswordDocumentUpdateDto.markdown = postPasswordMarkdownList.map((imageUrl: string) => decodeURIComponent(imageUrl));
            }

            // Define the arguments for create post
            const postPasswordCreateArgs: Prisma.PostPasswordCreateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostPasswordSelect(),
                user: {
                  select: request.server.prismaPlugin.getUserSelect()
                }
              },
              data: {
                ...request.body,
                firebaseUid: postPasswordDocumentReference.id,
                user: {
                  connect: {
                    firebaseUid: userFirebaseUid
                  }
                }
              }
            };

            // Create the post
            const postPassword: PostPassword & Record<string, any> = await prismaClient.postPassword.create(postPasswordCreateArgs);

            //! Define rollback action for delete post row
            requestRollback.postPassword = async (): Promise<void> => {
              // Define arguments to delete post
              const postPasswordDeleteArgs: Prisma.PostPasswordDeleteArgs = {
                where: {
                  id: postPassword.id,
                  userFirebaseUid
                }
              };

              // Delete post
              await prismaClient.postPassword.delete(postPasswordDeleteArgs);
            }

            // Update the DTO for updating the Firestore document
            postPasswordDocumentUpdateDto.postPasswordId = postPassword.id;

            // Perform the update operation on the Firestore document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postPasswordDocumentUpdate: WriteResult = await postPasswordDocumentReference
              .update(postPasswordDocumentUpdateDto)
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/update-document-failed', error, request));

            // Return the post
            return postPassword;
          }).then((postPassword: PostPassword) => {
            // Send success response with created post
            return reply.status(201).send({
              data: postPassword,
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
