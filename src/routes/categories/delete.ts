/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Category, Post, Prisma, PrismaClient } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { DocumentData, WriteResult } from 'firebase-admin/lib/firestore';
import { parse } from 'path';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Categories'],
      description: 'Removes specific Category from the database',
      security: [
        {
          Authorization: []
        }
      ],
      params: {
        $ref: 'paramsIdSchema#'
      },
      querystring: {
        type: 'object',
        properties: {
          categoryId: {
            type: 'number',
            minimum: 1
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
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
        400: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<ParamsId & QuerystringSearch>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract common information from request object
      const userId: number = Number(request.user.id);
      const userFirebaseUid: string = String(request.user.firebaseUid);

      // Extract category and post related information from the request object
      const categoryId: number = Number(request.params.id);
      const categoryPostListMoveTo: number = Number(request.query.categoryId);
      const categoryPostList: Post[] = [];
      const categoryPostListDocumentReference: DocumentReference[] = [];
      const categoryPostListDocumentSnapshot: DocumentSnapshot[] = [];

      // Make post deleting preparations before start transaction (if not move them to another category)
      if (!categoryPostListMoveTo) {
        // Define arguments to find posts associated with the category
        const postFindManyArgs: Prisma.PostFindManyArgs = {
          select: {
            firebaseUid: true,
            image: true
          },
          where: {
            userId,
            categoryId
          }
        };

        // Retrieve the list of posts associated with the category
        const postList: Post[] = await request.server.prisma.post.findMany(postFindManyArgs);

        // Push the retrieved posts to the categoryPostList array
        categoryPostList.push(...postList);

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
          .catch(() => {
            throw new Error('fastify/firestore/failed-get-all-post');
          });

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

            // If there is no move operation
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
                .catch(() => {
                  throw new Error('fastify/firestore/failed-delete-post');
                });

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
                  .catch(() => {
                    throw new Error('fastify/storage/failed-move-post-image-to-temp');
                  });

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
                  .catch(() => {
                    throw new Error('fastify/storage/failed-move-post-image-to-temp');
                  });

                //! Define rollback action for post markdown images moved to temporary storage
                requestRollback.tempListMarkdownList = async (): Promise<void> => {
                  await Promise.all(tempListMarkdownList.map(async (tempMarkdownList: string[], i: number): Promise<string[]> => {
                    return request.server.storagePlugin.setImageListMove(tempMarkdownList, parse(postListMarkdownList[i][0]).dir);
                  }));
                };
              }

              // Define arguments to delete category related posts
              const postDeleteManyArgs: Prisma.PostDeleteManyArgs = {
                where: {
                  userId,
                  categoryId
                }
              };

              // Delete category related posts
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postList: Prisma.BatchPayload = await prismaClient.post.deleteMany(postDeleteManyArgs);
            } else {
              // Define arguments to update category related posts
              const postUpdateManyArgs: Prisma.PostUpdateManyArgs = {
                where: {
                  userId,
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

            // Define arguments to delete category
            const categoryDeleteArgs: Prisma.CategoryDeleteArgs = {
              select: {
                ...request.server.prismaPlugin.getCategorySelect(),
              },
              where: {
                id: categoryId,
                userId
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
