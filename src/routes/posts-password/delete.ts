/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PostPassword, Prisma, PrismaClient } from '../../database/client';
import type { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { PostDeleteDto } from '../../types/dto/post/post-delete';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Password'],
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
    handler: async function (request: FastifyRequest<PostDeleteDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postPasswordId: number = Number(request.params.id);
      const postPasswordFirebaseUid: string = request.query.firebaseUid;
      const postPasswordPath: string = ['users', userFirebaseUid, 'posts-password', postPasswordFirebaseUid].join('/');

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

            // Get the reference to the post document
            const postPasswordDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(postPasswordPath);

            // Get the snapshot of the post document
            const postPasswordDocumentSnapshot: DocumentSnapshot = await postPasswordDocumentReference
              .get()
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/get-document-failed', error, request));

            //! Define rollback action for delete Firestore post document
            requestRollback.postPasswordDocument = async (): Promise<void> => {
              await postPasswordDocumentReference.set(postPasswordDocumentSnapshot.data() as DocumentData)
            };

            // Delete Firestore post document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postPasswordDocumentDelete: WriteResult = await postPasswordDocumentReference
              .delete()
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/delete-document-failed', error, request));

            // Define arguments to delete post
            const postPasswordDeleteArgs: Prisma.PostPasswordDeleteArgs = {
              select: {
                ...request.server.prismaPlugin.getPostPasswordSelect(),
                firebaseUid: true,
                userFirebaseUid: true
              },
              where: {
                id: postPasswordId,
                userFirebaseUid
              }
            };

            // Delete post
            return prismaClient.postPassword.delete(postPasswordDeleteArgs);
          }).then((postPassword: PostPassword) => {
            //! Queue append
            request.server.lavinMQPlugin.setImageListMoveToTemp([postPasswordPath, 'image'].join('/'));
            request.server.lavinMQPlugin.setImageListMoveToTemp([postPasswordPath, 'markdown'].join('/'));

            // Send success response with deleted post
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
