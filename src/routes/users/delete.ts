/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Category, Post, PostPassword, PostPrivate, Prisma, PrismaClient, User } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { DocumentData, DocumentReference, DocumentSnapshot } from 'firebase-admin/lib/firestore';
import type { UserRecord } from 'firebase-admin/lib/auth/user-record';
import type { UserDeleteDto } from '../../types/dto/user/user-delete';
import type { GetObjectsResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':uid',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Users'],
      description: 'Removes the user',
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
    // prettier-ignore
    handler: async function (request: FastifyRequest<UserDeleteDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Check if there are results in the fetched user index objects
      const userIndexObject: Record<string, unknown> = await request.server.algolia.getObject({
        indexName: 'user',
        objectID: userFirebaseUid
      });

      // Get Auth user record
      const userAuthRecord: UserRecord = await request.server.auth.getUser(userFirebaseUid);

      // Construct Firestore document references for user
      const userDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(['users', userFirebaseUid].join('/'));
      const userDocumentSnapshot: DocumentSnapshot = await userDocumentReference.get();

      // Define arguments to fetch user's posts and password and private from Prisma
      const postFindManyArgs: Prisma.PostPasswordFindManyArgs | Prisma.PostPrivateFindManyArgs | Prisma.PostFindManyArgs = {
        select: {
          id: true,
          cover: true,
          markdown: true
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

      // Initialize the Algolia search index for category related posts objects
      const postIndexObjects: GetObjectsResponse<any> = await request.server.algolia.getObjects({
        requests: (postListMap.post as Post[]).map((post: Post) => ({
          indexName: 'post',
          objectID: String(post.id)
        }))
      });

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
      const categoryIndexObjects: GetObjectsResponse<any> = await request.server.algolia.getObjects({
        requests: categoryPostList.map((category: Category) => ({
          indexName: 'category',
          objectID: String(category.id)
        }))
      });

      // Counter for transaction retries
      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<User> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // Check if there are results in the fetched posts index objects
            if (postIndexObjects?.results.length) {
              //! Define rollback action for Algolia delete category related post objects
              requestRollback.postIndexObjects = async (): Promise<void> => {
                await request.server.algolia.batch({
                  indexName: 'post',
                  batchWriteParams: {
                    requests: postIndexObjects.results.map((postIndexObject: any) => ({
                      action: 'addObject',
                      body: postIndexObject
                    }))
                  }
                });
              };

              // Delete Algolia posts index object
              await request.server.algolia.batch({
                indexName: 'post',
                batchWriteParams: {
                  requests: postIndexObjects.results.map((postIndexObject: any) => ({
                    action: 'deleteObject',
                    body: postIndexObject
                  }))
                }
              });
            }

            // Check if there are results in the fetched categories index objects
            if (categoryIndexObjects?.results.length) {
              //! Define rollback action for Algolia delete category objects
              requestRollback.categoryIndexObjects = async (): Promise<void> => {
                await request.server.algolia.batch({
                  indexName: 'category',
                  batchWriteParams: {
                    requests: categoryIndexObjects.results.map((categoryIndexObject: any) => ({
                      action: 'addObject',
                      body: categoryIndexObject
                    }))
                  }
                });
              };

              // Delete Algolia categories index object
              await request.server.algolia.batch({
                indexName: 'category',
                batchWriteParams: {
                  requests: categoryIndexObjects.results.map((categoryIndexObject: any) => ({
                    action: 'deleteObject',
                    body: categoryIndexObject
                  }))
                }
              });
            }

            //! Define rollback action for Algolia delete user object
            requestRollback.userIndexObjects = async (): Promise<void> => {
              await request.server.algolia.saveObject({
                indexName: 'user',
                body: userIndexObject
              });
            };

            // Delete Algolia user index object
            await request.server.algolia.deleteObject({
              indexName: 'user',
              objectID: userFirebaseUid
            });

            //! Define rollback action for user Firestore document
            requestRollback.userDocument = async (): Promise<void> => {
              await userDocumentReference.set(userDocumentSnapshot.data() as DocumentData);
            };

            // Delete user Firestore document
            await userDocumentReference.delete();

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
            await request.server.auth.deleteUser(userAuthRecord.uid);

            // Define arguments to delete user
            const userDeleteArgs: Prisma.UserDeleteArgs = {
              select: {
                avatar: true
              },
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
                // Extract post information from the request object
                const postCover: string | null = post.cover;
                const postMarkdown: string = post.markdown;

                // Get the list of images in the post markdown body
                const bodyMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);
                const postMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownImageList);

                // If there is a cover
                if (postCover) {
                  //! Queue append
                  request.server.lavinMQPlugin.setImageListMoveToTemp(JSON.stringify(request.server.markdownPlugin.getImageListFromBucket([postCover])));
                }

                // If there are post markdown images
                if (postMarkdownImageList.length) {
                  //! Queue append
                  request.server.lavinMQPlugin.setImageListMoveToTemp(JSON.stringify(postMarkdownImageList));
                }
              });
            }

            //! Queue append
            request.server.lavinMQPlugin.setImageListMoveToTemp(JSON.stringify(request.server.markdownPlugin.getImageListFromBucket([user.avatar])));

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
