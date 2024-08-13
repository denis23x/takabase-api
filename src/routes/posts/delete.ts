/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Post, Prisma, PrismaClient } from '../../database/client';
import type { PostDeleteDto } from '../../types/dto/post/post-delete';
import type { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { SearchIndex } from 'algoliasearch';
import type { ChunkedBatchResponse, GetObjectsResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts'],
      description: 'Removes specific Post from the database',
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
    handler: async function (request: FastifyRequest<PostDeleteDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postId: number = Number(request.params.id);
      const postFirebaseUid: string = request.query.firebaseUid;
      const postPath: string = ['users', userFirebaseUid, 'posts', postFirebaseUid].join('/');
      const postIndex: SearchIndex = request.server.algolia.initIndex('post');
      const postIndexObjects: GetObjectsResponse<any> = await postIndex.getObjects([String(postId)]);

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

            // Check if there are results in the fetched post index objects
            if (postIndexObjects.results.length) {
              //! Define rollback action for Algolia delete post object
              requestRollback.postIndexObjects = async (): Promise<void> => {
                await postIndex.saveObjects([...postIndexObjects.results]);
              };

              // Delete Algolia post index object
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postIndexObjectsDelete: ChunkedBatchResponse = await postIndex.deleteObjects([String(postId)]);
            }

            // Define arguments to delete post
            const postDeleteArgs: Prisma.PostDeleteArgs = {
              select: {
                ...request.server.prismaPlugin.getPostSelect(),
                firebaseUid: true,
                userFirebaseUid: true
              },
              where: {
                id: postId,
                userFirebaseUid
              }
            };

            // Delete post
            return prismaClient.post.delete(postDeleteArgs);
          }).then((post: Post) => {
            //! Queue append
            request.server.lavinMQPlugin.setImageListMoveToTemp([postPath, 'image'].join('/'));
            request.server.lavinMQPlugin.setImageListMoveToTemp([postPath, 'markdown'].join('/'));

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
