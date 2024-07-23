/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Category, Post, Prisma, PrismaClient, User } from '../../database/client';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import { parse } from 'path';
import { UserDeleteDto } from '../../types/dto/user/user-delete';
import { ChunkedBatchResponse, GetObjectsResponse } from '@algolia/client-search';
import { SearchIndex } from 'algoliasearch';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Users'],
      description: 'Removes specific User from the database',
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
          password: {
            $ref: 'partsPasswordSchema#'
          }
        }
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              $ref: 'userSchema#'
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
    handler: async function (request: FastifyRequest<UserDeleteDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;
      const userId: number = Number(request.params.id);
      const userIndex: SearchIndex = request.server.algolia.initIndex('user');
      const userIndexObjects: GetObjectsResponse<any> = await userIndex.getObjects([String(userId)]);

      // Get Auth user record
      const userAuthRecord: UserRecord = await request.server.auth.getUser(userFirebaseUid);

      // Construct Firestore document references for user
      // prettier-ignore
      const userDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(['users', userFirebaseUid].join('/'));

      // Fetch document snapshots for user from Firestore
      // prettier-ignore
      const userDocumentSnapshot: DocumentSnapshot = await userDocumentReference.get();

      // Define arguments to fetch user's posts from Prisma
      const userPostFindManyArgs: Prisma.PostFindManyArgs = {
        select: {
          id: true,
          firebaseUid: true,
          image: true
        },
        where: {
          userFirebaseUid
        }
      };

      // Fetch user's posts from the database
      const userPostList: Post[] = await request.server.prisma.post.findMany(userPostFindManyArgs);

      // Initialize the Algolia search index for category related posts objects
      const postIndex: SearchIndex = request.server.algolia.initIndex('post');
      const postIndexIDs: string[] = userPostList.map((post: Post) => String(post.id));
      const postIndexObjects: GetObjectsResponse<any> = await postIndex.getObjects([...postIndexIDs]);

      // Construct Firestore document references for user's posts
      const userPostListDocumentReference: DocumentReference[] = userPostList
        .map((post: Post) => ['users', userFirebaseUid, 'posts', post.firebaseUid].join('/'))
        .map((documentPath: string) => request.server.firestorePlugin.getDocumentReference(documentPath));

      // Fetch document snapshots for user's posts from Firestore
      // prettier-ignore
      const userPostListDocumentSnapshot: DocumentSnapshot[] = await Promise.all(userPostListDocumentReference.map(async (documentReference: DocumentReference): Promise<DocumentSnapshot> => documentReference.get()));

      // Define arguments to fetch user's categories from Prisma
      const categoryPostFindManyArgs: Prisma.CategoryFindManyArgs = {
        select: {
          id: true
        },
        where: {
          userFirebaseUid
        }
      };

      // Fetch user's categories from the database
      const categoryPostList: Category[] = await request.server.prisma.category.findMany(categoryPostFindManyArgs);

      // Initialize the Algolia search index for category objects
      const categoryIndex: SearchIndex = request.server.algolia.initIndex('category');
      const categoryIndexIDs: string[] = categoryPostList.map((category: Category) => String(category.id));
      const categoryIndexObjects: GetObjectsResponse<any> = await categoryIndex.getObjects([...categoryIndexIDs]);

      // Counter for transaction retries
      let requestRetries: number = 0;

      // Object to store rollback actions in case of transaction failure
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<User> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            //! Define rollback action for user's Firestore post documents
            requestRollback.postListDocument = async (): Promise<void> => {
              await Promise.all(userPostListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => {
                const documentSnapshot: DocumentSnapshot | undefined = userPostListDocumentSnapshot.find((snapshot: DocumentSnapshot) => {
                  return snapshot.id === documentReference.id
                });

                return documentReference.set(documentSnapshot?.data() as DocumentData);
              }));
            };

            // Delete user's Firestore post documents
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postListDocumentDelete: WriteResult[] = await Promise
              .all(userPostListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => documentReference.delete()))
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/delete-document-failed', error, request));

            // Extract URLs of images associated with user's posts
            const postListImageList: string[] = userPostList
              .filter((post: Post) => post.image)
              .map((post: Post) => post.image);

            // Move images associated with user's posts to temporary storage
            if (postListImageList.length) {
              const postListImageListDestination: string[] = request.server.markdownPlugin.getImageListRelativeUrl(postListImageList);
              const tempListImageList: string[] = await request.server.storagePlugin
                .setImageListMove(postListImageListDestination, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for images moved to temporary storage
              requestRollback.tempListImageList = async (): Promise<void> => {
                await Promise.all(tempListImageList.map(async (tempImageList: string, i: number): Promise<string[]> => {
                  return request.server.storagePlugin.setImageListMove([tempImageList], parse(decodeURIComponent(postListImageListDestination[i])).dir);
                }));
              };
            }

            // Extract URLs of markdown images associated with user's posts
            const postListMarkdownList: string[][] = userPostListDocumentSnapshot
              .map((documentSnapshot: DocumentSnapshot) => documentSnapshot.data())
              .filter((documentData: DocumentData | undefined) => documentData?.markdown)
              .map((documentData: DocumentData | undefined) => documentData?.markdown);

            // Move markdown images associated with user's posts to temporary storage
            if (postListMarkdownList.some((postMarkdownList: string[]) => postMarkdownList.length)) {
              const tempListMarkdownList: string[][] = await Promise
                .all(postListMarkdownList.map(async (postMarkdownList: string[]): Promise<string[]> => {
                  return request.server.storagePlugin.setImageListMove(postMarkdownList, 'temp');
                }))
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for markdown images moved to temporary storage
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

            // Define arguments to delete user's posts
            const postDeleteManyArgs: Prisma.PostDeleteManyArgs = {
              where: {
                userFirebaseUid
              }
            };

            // Delete user's posts
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postList: Prisma.BatchPayload = await prismaClient.post.deleteMany(postDeleteManyArgs);

            // Check if there are results in the fetched category index objects
            if (categoryIndexObjects.results.length) {
              //! Define rollback action for Algolia delete category objects
              requestRollback.categoryIndexObjects = async (): Promise<void> => {
                await categoryIndex.saveObjects([...categoryIndexObjects.results]);
              };

              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const categoryIndexObjectsDelete: ChunkedBatchResponse = await categoryIndex.deleteObjects([...categoryIndexIDs]);
            }

            // Define arguments to delete user's categories
            const categoryDeleteManyArgs: Prisma.CategoryDeleteManyArgs = {
              where: {
                userFirebaseUid
              }
            };

            // Delete user's categories
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const categoryList: Prisma.BatchPayload = await prismaClient.category.deleteMany(categoryDeleteManyArgs);

            //! Define rollback action for user Firestore document
            requestRollback.userDocument = async (): Promise<void> => {
              await userDocumentReference.set(userDocumentSnapshot?.data() as DocumentData);
            };

            // Delete user Firestore document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const userDocumentDelete: WriteResult = await userDocumentReference.delete();

            //! Define rollback action for user Auth record
            requestRollback.userRecord = async (): Promise<void> => {
              await request.server.auth.createUser({
                uid: userFirebaseUid,
                email: userAuthRecord.email,
                emailVerified: userAuthRecord.emailVerified,
                password: request.query.password,
                displayName: userAuthRecord.displayName,
                disabled: userAuthRecord.disabled
              });
            };

            // Delete user Auth record
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const userAuthRecordDelete: UserRecord = await request.server.auth.deleteUser(userAuthRecord.uid);

            // Fetch the list of user avatars
            const userAvatarListDestination: string = ['users', userFirebaseUid, 'avatar'].join('/');
            const userAvatarList: string[] = await request.server.storagePlugin
              .getImageList(userAvatarListDestination)
              .catch((error: any) => request.server.helperPlugin.throwError('storage/get-filelist-failed', error, request));

            // Move images associated with user avatar to temporary storage
            if (userAvatarList.length) {
              const tempAvatarList: string[] = await request.server.storagePlugin
                .setImageListMove(userAvatarList, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for user avatars moved to temporary storage
              requestRollback.tempAvatarList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempAvatarList, userAvatarListDestination);
              };
            }

            // Check if there are results in the fetched user index objects
            if (userIndexObjects.results.length) {
              //! Define rollback action for Algolia delete user object
              requestRollback.userIndexObjects = async (): Promise<void> => {
                await userIndex.saveObjects([...userIndexObjects.results]);
              };

              // Delete Algolia user index object
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const userIndexObjectsDelete: ChunkedBatchResponse = await userIndex.deleteObjects([String(userId)]);
            }

            // Define arguments to delete user
            const userDeleteArgs: Prisma.UserDeleteArgs = {
              select: request.server.prismaPlugin.getUserSelect(),
              where: {
                id: userId,
                firebaseUid: userFirebaseUid
              }
            };

            // Delete user
            return prismaClient.user.delete(userDeleteArgs);
          }).then((user: User) => {
            // Send success response with deleted user data
            return reply.status(200).send({
              data: user,
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
