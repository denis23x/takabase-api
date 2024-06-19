/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post, Prisma, PrismaClient } from '../../database/client';
import { PostDeleteDto } from '../../types/dto/post/post-delete';
import { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { SearchIndex } from 'algoliasearch';
import { ChunkedBatchResponse, GetObjectsResponse } from '@algolia/client-search';

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
      const postImage: string | undefined = request.query.image;
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

            // Prepare the post image URLs
            const postPath: string = ['users', userFirebaseUid, 'posts', postFirebaseUid].join('/');
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
              select: request.server.prismaPlugin.getPostSelect(),
              where: {
                id: postId,
                userFirebaseUid
              }
            };

            // Delete post
            return prismaClient.post.delete(postDeleteArgs);
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
