/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PostPrivate, Prisma, PrismaClient } from '../../database/client';
import type { PostPrivateDeleteDto } from '../../types/dto/post-private/post-private-delete';
import type { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';
import type { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Private'],
      description: 'Removes specific Private from the database',
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
      querystring: {
        type: 'object',
        properties: {
          firebaseUid: {
            $ref: 'partsFirebaseUidSchema#'
          },
          image: {
            $ref: 'partsFirebaseUrlStorageSchema#'
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
    handler: async function (request: FastifyRequest<PostPrivateDeleteDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postPrivateId: number = Number(request.params.id);
      const postPrivateFirebaseUid: string = request.query.firebaseUid;
      const postPrivateImage: string | undefined = request.query.image;

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

            // Prepare the post image URLs
            const postPrivatePath: string = ['users', userFirebaseUid, 'posts-private', postPrivateFirebaseUid].join('/');
            const postPrivateMarkdownListDestination: string = [postPrivatePath, 'markdown'].join('/');

            // Get the reference to the post document
            const postPrivateDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(postPrivatePath);

            // Get the snapshot of the post document
            const postPrivateDocumentSnapshot: DocumentSnapshot = await postPrivateDocumentReference
              .get()
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/get-document-failed', error, request));

            //! Define rollback action for delete Firestore post document
            requestRollback.postPrivateDocument = async (): Promise<void> => {
              await postPrivateDocumentReference.set(postPrivateDocumentSnapshot.data() as DocumentData)
            };

            // Delete Firestore post document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postPrivateDocumentDelete: WriteResult = await postPrivateDocumentReference
              .delete()
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/delete-document-failed', error, request));

            // If post has an image, move it to temp storage
            if (postPrivateImage) {
              // Define the destination path of the post image
              const postPrivateImageListDestination: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postPrivateImage]);

              // Move the post image to temporary storage
              const tempImageList: string[] = await request.server.storagePlugin
                .setImageListMove(postPrivateImageListDestination, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for post image moved to temporary storage
              requestRollback.tempImageList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempImageList, postPrivatePath);
              };
            }

            // Get the list of markdown images associated with the post
            const postPrivateMarkdownList: string[] = await request.server.storagePlugin
              .getImageList(postPrivateMarkdownListDestination)
              .catch((error: any) => request.server.helperPlugin.throwError('storage/get-filelist-failed', error, request));

            // If there are markdown images associated with the post
            if (postPrivateMarkdownList.length) {
              // Move the post markdown images to temporary storage
              const tempMarkdownList: string[] = await request.server.storagePlugin
                .setImageListMove(postPrivateMarkdownList, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for post markdown images moved to temporary storage
              requestRollback.tempMarkdownList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempMarkdownList, postPrivateMarkdownListDestination);
              };
            }

            // Define arguments to delete post
            const postPrivateDeleteArgs: Prisma.PostPrivateDeleteArgs = {
              select: request.server.prismaPlugin.getPostPrivateSelect(),
              where: {
                id: postPrivateId,
                userFirebaseUid
              }
            };

            // Delete post
            return prismaClient.postPrivate.delete(postPrivateDeleteArgs);
          }).then((postPrivate: PostPrivate) => {
            // Send success response with deleted post
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
