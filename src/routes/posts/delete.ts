/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post, Prisma, PrismaClient } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Posts'],
      description: 'Removes specific Post from the database',
      security: [
        {
          Authorization: []
        }
      ],
      params: {
        type: 'object',
        allOf: [
          {
            $ref: 'partsIdSchema#'
          }
        ]
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
    handler: async function (request: FastifyRequest<ParamsId>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract common information from request object
      const userId: number = Number(request.user.id);
      const userFirebaseUid: string = String(request.user.firebaseUid);

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

            // Define arguments to delete post
            const postDeleteArgs: Prisma.PostDeleteArgs = {
              select: {
                firebaseUid: true,
                image: true
              },
              where: {
                userId,
                id: request.params.id
              }
            };

            // Delete post
            const post: Post = await prismaClient.post.delete(postDeleteArgs);
            const postFirebaseUid: string = String(post.firebaseUid);
            const postPath: string = ['users', userFirebaseUid, 'posts', postFirebaseUid].join('/');
            const postImage: string | null = post.image;
            const postMarkdownListDestination: string = [postPath, 'markdown'].join('/');

            // Get the reference to the post document
            const postDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(postPath);

            // Get the snapshot of the post document
            const postDocumentSnapshot: DocumentSnapshot = await postDocumentReference
              .get()
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/get-document-failed', error, request));

            //! Define rollback action for delete Firestore post document
            requestRollback.postDocument = async (): Promise<void> => {
              await postDocumentReference.set(postDocumentSnapshot.data() as DocumentData)
            };

            // Delete Firestore post document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postDocumentDelete: WriteResult = await postDocumentReference
              .delete()
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/delete-document-failed', error, request));

            // If post has an image, move it to temp storage
            if (postImage) {
              // Define the destination path of the post image
              const postImageListDestination: string[] = request.server.markdownPlugin.getImageListRelativeUrl([postImage]);

              // Move the post image to temporary storage
              const tempImageList: string[] = await request.server.storagePlugin
                .setImageListMove(postImageListDestination, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for post image moved to temporary storage
              requestRollback.tempImageList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempImageList, postPath);
              };
            }

            // Get the list of markdown images associated with the post
            const postMarkdownList: string[] = await request.server.storagePlugin
              .getImageList(postMarkdownListDestination)
              .catch((error: any) => request.server.helperPlugin.throwError('storage/get-filelist-failed', error, request));

            // If there are markdown images associated with the post
            if (postMarkdownList.length) {
              // Move the post markdown images to temporary storage
              const tempMarkdownList: string[] = await request.server.storagePlugin
                .setImageListMove(postMarkdownList, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for post markdown images moved to temporary storage
              requestRollback.tempMarkdownList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempMarkdownList, postMarkdownListDestination);
              };
            }

            // Delete post
            return post;
          }).then((post: Post) => {
            // Send success response with deleted post
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
