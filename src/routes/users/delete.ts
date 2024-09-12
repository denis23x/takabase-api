/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Category, Post, PostPassword, PostPrivate, Prisma, PrismaClient, User } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';
import type { UserRecord } from 'firebase-admin/lib/auth/user-record';
import type { UserDeleteDto } from '../../types/dto/user/user-delete';
import type { ChunkedBatchResponse, GetObjectsResponse } from '@algolia/client-search';
import type { SearchIndex } from 'algoliasearch';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':uid',
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
          uid: {
            $ref: 'partsFirebaseUidSchema#'
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
      const userIndex: SearchIndex = request.server.algolia.initIndex('user');
      const userIndexObjects: GetObjectsResponse<any> = await userIndex.getObjects([userFirebaseUid]);

      // Get Auth user record
      const userAuthRecord: UserRecord = await request.server.auth.getUser(userFirebaseUid);

      // Construct Firestore document references for user
      // prettier-ignore
      const userDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(['users', userFirebaseUid].join('/'));

      // Fetch document snapshots for user from Firestore
      // prettier-ignore
      const userDocumentSnapshot: DocumentSnapshot = await userDocumentReference.get();

      // Define arguments to fetch user's posts and password and private from Prisma
      // prettier-ignore
      const postFindManyArgs: Prisma.PostPasswordFindManyArgs | Prisma.PostPrivateFindManyArgs | Prisma.PostFindManyArgs = {
        select: {
          id: true,
          firebaseUid: true
        },
        where: {
          userFirebaseUid
        }
      };

      // Fetch user's posts and password and private from the database
      const postListMap: Record<string, (Post | PostPassword | PostPrivate)[]> = {
        postPassword: await request.server.prisma.postPassword.findMany(postFindManyArgs),
        postPrivate: await request.server.prisma.postPrivate.findMany(postFindManyArgs),
        post: await request.server.prisma.post.findMany(postFindManyArgs)
      };

      // Construct Firestore document references for user's posts or password or private from the Firestore
      // prettier-ignore
      const getReference = (postList: (Post | PostPassword | PostPrivate)[], postPath: string): DocumentReference[] => {
        return postList
          .map((post: Post | PostPassword | PostPrivate) => ['users', userFirebaseUid, postPath, post.firebaseUid].join('/'))
          .map((documentPath: string) => request.server.firestorePlugin.getDocumentReference(documentPath));
      };

      const postReferenceListMap: Record<string, DocumentReference[]> = {
        postPassword: getReference(postListMap.postPassword, 'posts-password'),
        postPrivate: getReference(postListMap.postPrivate, 'posts-private'),
        post: getReference(postListMap.post, 'posts')
      };

      // Fetch document snapshots for user's posts or password or private from the Firestore
      // prettier-ignore
      const getSnapshot = (postListReference: DocumentReference[]): Promise<DocumentSnapshot[]> => {
        return Promise.all(postListReference.map(async (documentReference: DocumentReference): Promise<DocumentSnapshot> => documentReference.get()));
      };

      const postSnapshotListMap: Record<string, DocumentSnapshot[]> = {
        postPassword: await getSnapshot(postReferenceListMap.postPassword),
        postPrivate: await getSnapshot(postReferenceListMap.postPrivate),
        post: await getSnapshot(postReferenceListMap.post)
      };

      // Initialize the Algolia search index for category related posts objects
      const postIndex: SearchIndex = request.server.algolia.initIndex('post');
      const postIndexIDs: string[] = (postListMap.post as Post[]).map((post: Post) => String(post.id));
      const postIndexObjects: GetObjectsResponse<any> = await postIndex.getObjects([...postIndexIDs]);

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

            // Run for every post entity
            for (const key of Object.keys(postListMap)) {
              const postReferenceList: DocumentReference[] = postReferenceListMap[key];
              const postSnapshotList: DocumentSnapshot[] = postSnapshotListMap[key];

              //! Define rollback action for user's Firestore post documents
              requestRollback[key + 'Document'] = async (): Promise<void> => {
                await Promise.all(postReferenceList.map(async (documentReference: DocumentReference): Promise<WriteResult> => {
                  const documentSnapshot: DocumentSnapshot | undefined = postSnapshotList.find((snapshot: DocumentSnapshot) => {
                    return snapshot.id === documentReference.id
                  });

                  return documentReference.set(documentSnapshot?.data() as DocumentData);
                }));
              };

              // Delete user's Firestore post documents
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postListDocumentDelete: WriteResult[] = await Promise
                .all(postReferenceList.map(async (documentReference: DocumentReference): Promise<WriteResult> => documentReference.delete()))
                .catch((error: any) => request.server.helperPlugin.throwError('firestore/delete-document-failed', error, request));
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

            // Check if there are results in the fetched user index objects
            if (userIndexObjects.results.length) {
              //! Define rollback action for Algolia delete user object
              requestRollback.userIndexObjects = async (): Promise<void> => {
                await userIndex.saveObjects([...userIndexObjects.results]);
              };

              // Delete Algolia user index object
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const userIndexObjectsDelete: ChunkedBatchResponse = await userIndex.deleteObjects([userFirebaseUid]);
            }

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

            // Define arguments to delete user
            const userDeleteArgs: Prisma.UserDeleteArgs = {
              select: request.server.prismaPlugin.getUserSelect(),
              where: {
                firebaseUid: userFirebaseUid
              }
            };

            // Delete user
            return prismaClient.user.delete(userDeleteArgs);
          }).then((user: User) => {
            // Run for every post entity
            for (const key of Object.keys(postListMap)) {
              postListMap[key].forEach((post: Post | PostPassword | PostPrivate) => {
                const postPathEntity: string = request.server.helperPlugin.camelCaseToDashCase(key).replace('post', 'posts');
                const postPath: string = ['users', userFirebaseUid, postPathEntity, post.firebaseUid].join('/');

                //! Queue append
                request.server.lavinMQPlugin.setImageListMoveToTemp([postPath, 'image'].join('/'));
                request.server.lavinMQPlugin.setImageListMoveToTemp([postPath, 'markdown'].join('/'));
              });
            }

            //! Queue append
            request.server.lavinMQPlugin.setImageListMoveToTemp(['users', userFirebaseUid, 'avatar'].join('/'));

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
