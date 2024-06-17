/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Category, Post, Prisma, PrismaClient } from '../../database/client';
import { CategoryDeleteDto } from '../../types/dto/category/category-delete';
import { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { DocumentData, WriteResult } from 'firebase-admin/lib/firestore';
import { parse } from 'path';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { SearchIndex } from 'algoliasearch';
import { ChunkedBatchResponse, GetObjectsResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Categories'],
      description: 'Removes specific Category from the database',
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
          categoryId: {
            $ref: 'partsIdSchema#'
          }
        }
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              $ref: 'categorySchema#'
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
    handler: async function (request: FastifyRequest<CategoryDeleteDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract category and post related information from the request object
      const categoryId: number = Number(request.params.id);
      const categoryPostListMoveTo: number = Number(request.query.categoryId);
      const categoryPostList: Post[] = [];
      const categoryPostListDocumentReference: DocumentReference[] = [];
      const categoryPostListDocumentSnapshot: DocumentSnapshot[] = [];
      const categoryIndex: SearchIndex = request.server.algolia.initIndex('category');
      const categoryIndexObjects: GetObjectsResponse<any> = await categoryIndex.getObjects([String(categoryId)]);

      // Define arguments to find posts associated with the category
      const postFindManyArgs: Prisma.PostFindManyArgs = {
        select: {
          id: true,
          firebaseUid: true,
          image: true
        },
        where: {
          userFirebaseUid,
          categoryId
        }
      };

      // Retrieve the list of posts associated with the category
      const postList: Post[] = await request.server.prisma.post.findMany(postFindManyArgs);

      // Push the retrieved posts to the categoryPostList array
      categoryPostList.push(...postList);

      // Initialize the Algolia search index for category related posts objects
      const postIndex: SearchIndex = request.server.algolia.initIndex('post');
      const postIndexIDs: string[] = categoryPostList.map((post: Post) => String(post.id));
      const postIndexObjects: GetObjectsResponse<any> = await postIndex.getObjects([...postIndexIDs]);

      // Make post deleting preparations (Firebase References & Snapshots)
      if (!categoryPostListMoveTo) {
        // Define an array of DocumentReference objects for the post documents in Firestore
        const postListDocumentReference: DocumentReference[] = categoryPostList
          .map((post: Post) => ['users', userFirebaseUid, 'posts', post.firebaseUid].join('/'))
          .map((documentPath: string) => request.server.firestorePlugin.getDocumentReference(documentPath));

        // Push the DocumentReference objects to the categoryPostListDocumentReference array
        categoryPostListDocumentReference.push(...postListDocumentReference);

        // Retrieve the DocumentSnapshot objects for the post documents in Firestore
        // prettier-ignore
        const postListDocumentSnapshot: DocumentSnapshot[] = await Promise
          .all(postListDocumentReference.map(async (documentReference: DocumentReference): Promise<DocumentSnapshot> => documentReference.get()))
          .catch((error: any) => request.server.helperPlugin.throwError('firestore/get-list-failed', error, request));

        // Push the retrieved DocumentSnapshot objects to the categoryPostListDocumentSnapshot array
        categoryPostListDocumentSnapshot.push(...postListDocumentSnapshot);
      }

      // Counter for transaction retries
      let requestRetries: number = 0;

      // Object to store rollback actions in case of transaction failure
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Category> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // If there is NOT a move operation
            if (!categoryPostListMoveTo) {
              //! Define rollback action for Firestore delete category related post documents
              requestRollback.postListDocument = async (): Promise<void> => {
                await Promise.all(categoryPostListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => {
                  const documentSnapshot: DocumentSnapshot | undefined = categoryPostListDocumentSnapshot.find((snapshot: DocumentSnapshot) => {
                    return snapshot.id === documentReference.id
                  });

                  return documentReference.set(documentSnapshot?.data() as DocumentData);
                }));
              };

              // Delete category related Firestore post documents
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postListDocumentDelete: WriteResult[] = await Promise
                .all(categoryPostListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => documentReference.delete()))
                .catch((error: any) => request.server.helperPlugin.throwError('firestore/delete-document-failed', error, request));

              // Extract URLs of post images associated with category
              const postListImageList: string[] = categoryPostList
                .filter((post: Post) => post.image)
                .map((post: Post) => post.image);

              // Move post images associated with category to temporary storage
              if (postListImageList.length) {
                // Define the destination path of the post image
                const postListImageListDestination: string[] = request.server.markdownPlugin.getImageListRelativeUrl(postListImageList);

                // Move the post image to temporary storage
                const tempListImageList: string[] = await request.server.storagePlugin
                  .setImageListMove(postListImageListDestination, 'temp')
                  .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

                //! Define rollback action for post images moved to temporary storage
                requestRollback.tempListImageList = async (): Promise<void> => {
                  await Promise.all(tempListImageList.map(async (tempImageList: string, i: number): Promise<string[]> => {
                    return request.server.storagePlugin.setImageListMove([tempImageList], parse(decodeURIComponent(postListImageListDestination[i])).dir);
                  }));
                };
              }

              // Extract URLs of post markdown images associated with category
              const postListMarkdownList: string[][] = categoryPostListDocumentSnapshot
                .map((documentSnapshot: DocumentSnapshot) => documentSnapshot.data())
                .filter((documentData: DocumentData | undefined) => documentData?.markdown)
                .map((documentData: DocumentData | undefined) => documentData?.markdown);

              // Move post markdown images associated with category to temporary storage
              if (postListMarkdownList.some((postMarkdownList: string[]) => postMarkdownList.length)) {
                const tempListMarkdownList: string[][] = await Promise
                  .all(postListMarkdownList.map(async (postMarkdownList: string[]): Promise<string[]> => {
                    return request.server.storagePlugin.setImageListMove(postMarkdownList, 'temp');
                  }))
                  .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

                //! Define rollback action for post markdown images moved to temporary storage
                requestRollback.tempListMarkdownList = async (): Promise<void> => {
                  await Promise.all(tempListMarkdownList.map(async (tempMarkdownList: string[], i: number): Promise<string[]> => {
                    return request.server.storagePlugin.setImageListMove(tempMarkdownList, parse(postListMarkdownList[i][0]).dir);
                  }));
                };
              }

              // Check if there are results in the fetched post index objects
              if (postIndexObjects.results.length) {
                //! Define rollback action for Algolia delete category related post objects
                requestRollback.postIndexObjects = async (): Promise<void> => {
                  await postIndex.saveObjects([...postIndexObjects.results]);
                };

                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const postIndexObjectsDelete: ChunkedBatchResponse = await postIndex.deleteObjects([...postIndexIDs]);
              }

              // Define arguments to delete category related posts
              const postDeleteManyArgs: Prisma.PostDeleteManyArgs = {
                where: {
                  userFirebaseUid,
                  categoryId
                }
              };

              // Delete category related posts
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postList: Prisma.BatchPayload = await prismaClient.post.deleteMany(postDeleteManyArgs);
            } else {
              // Check if there are results in the fetched post index objects
              if (postIndexObjects.results.length) {
                //! Define rollback action for Algolia update category related post objects
                requestRollback.postIndexObjects = async (): Promise<void> => {
                  await postIndex.partialUpdateObjects([...postIndexObjects.results]);
                };

                // Map the results from the post index objects to create a new array of posts
                const postIndexObjectsNext: Partial<Post>[] = postIndexObjects.results.map((post: Partial<Post>) => ({
                  ...post,
                  category: {
                    id: categoryPostListMoveTo
                  }
                }));

                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const postIndexObjectsUpdate: ChunkedBatchResponse = await postIndex.partialUpdateObjects([...postIndexObjectsNext]);
              }

              // Define arguments to update category related posts
              const postUpdateManyArgs: Prisma.PostUpdateManyArgs = {
                where: {
                  userFirebaseUid,
                  categoryId
                },
                data: {
                  categoryId: categoryPostListMoveTo
                }
              };

              // Update category related posts
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postList: Prisma.BatchPayload = await prismaClient.post.updateMany(postUpdateManyArgs);
            }

            // Check if there are results in the fetched category index objects
            if (categoryIndexObjects.results.length) {
              //! Define rollback action for Algolia delete category object
              requestRollback.categoryIndexObjects = async (): Promise<void> => {
                await categoryIndex.saveObjects([...categoryIndexObjects.results]);
              };

              // Delete Algolia category index object
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const categoryIndexObjectsDelete: ChunkedBatchResponse = await categoryIndex.deleteObjects([String(categoryId)]);
            }

            // Define arguments to delete category
            const categoryDeleteArgs: Prisma.CategoryDeleteArgs = {
              select: request.server.prismaPlugin.getCategorySelect(),
              where: {
                id: categoryId,
                userFirebaseUid
              }
            };

            // Delete category
            return prismaClient.category.delete(categoryDeleteArgs);
          }).then((category: Category) => {
            // Send success response with deleted category
            return reply.status(200).send({
              data: category,
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
