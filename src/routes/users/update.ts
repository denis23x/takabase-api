/** @format */

import { storageConfig } from '../../config/storage.config';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Category, Prisma, PrismaClient, User } from '../../database/client';
import type { UserUpdateDto } from '../../types/dto/user/user-update';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { GetObjectsResponse } from '@algolia/client-search';
import type { UserRecord } from 'firebase-admin/lib/auth/user-record';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':uid',
    onRequest: fastify.verifyIdToken,
    preValidation: fastify.verifyUsername,
    schema: {
      tags: ['Users'],
      description: 'Updates the user',
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
      body: {
        type: 'object',
        properties: {
          name: {
            $ref: 'partsUsernameSchema#'
          },
          description: {
            $ref: 'partsUserDescriptionSchema#'
          },
          avatar: {
            $ref: 'partsImageSchema#'
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
    handler: async function (request: FastifyRequest<UserUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract user information from the request object
      const username: string | null = request.body.name as any;
      const userAvatar: string | null = request.body.avatar as any;
      const userRecord: UserRecord = await request.server.auth.getUser(userFirebaseUid);

      // Define the arguments for find a user
      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: {
          avatar: true,
          name: true
        },
        where: {
          firebaseUid: userFirebaseUid
        }
      };

      // User previous state
      const user: User = await request.server.prisma.user.findUniqueOrThrow(userFindUniqueOrThrowArgs);

      // Check if there are results in the fetched user index object
      const userIndexObject: Record<string, unknown> = await request.server.algolia.getObject({
        indexName: 'user',
        objectID: userFirebaseUid
      });

      // Prepare the list of categories for update Algolia indices
      let categoryList: Category[] = [];
      let categoryIndexObjects: GetObjectsResponse<any> = undefined;

      // Counter for transaction retries
      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<User> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // If there is a new avatar provided
            if (userAvatar && userAvatar !== user.avatar) {
              // Get the avatar relative /temp URL
              const tempAvatarList: string[] = request.server.markdownPlugin.getImageListFromBucket([userAvatar]);

              // Move the /temp avatar to the /avatars
              const userAvatarList: string[] = await request.server.storagePlugin
                .setImageListMove(tempAvatarList, storageConfig.paths.USER_AVATARS)
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error));

              //! Define rollback action for avatar to move it to the /temp back
              requestRollback.userAvatarList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(userAvatarList, 'temp');
              };

              // Replace the avatar URL in the request body with the new URL
              request.body.avatar = userAvatar.replace(tempAvatarList.shift(), userAvatarList.shift());
            }

            // If there is a previous avatar exists
            if (userAvatar === null || userAvatar !== user.avatar) {
              // Get the avatar relative URL
              const userPreviousAvatarList: string[] = request.server.markdownPlugin.getImageListFromBucket([user.avatar]);

              // Move the previous and unworthy avatar to the /temp
              const tempPreviousAvatarList: string[] = await request.server.storagePlugin
                .setImageListMove(userPreviousAvatarList, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error));

              //! Define rollback action for avatar to move it to the /avatars back
              requestRollback.tempAvatarList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempPreviousAvatarList, storageConfig.paths.USER_AVATARS);
              };
            }

            // If there is a changes valuable for searching
            if (userAvatar !== user.avatar || username !== user.name) {
              // Define the arguments for finding categories
              const categoryFindManyArgs: Prisma.CategoryFindManyArgs = {
                select: {
                  id: true
                },
                where: {
                  userFirebaseUid
                }
              };

              // Retrieve the list of categories from the MySQL and Algolia
              categoryList = await request.server.prisma.category.findMany(categoryFindManyArgs);
              categoryIndexObjects = await request.server.algolia.getObjects({
                requests: categoryList.map((category: Category) => ({
                  indexName: 'category',
                  objectID: String(category.id)
                }))
              });
            }

            // Define the arguments for updating user
            const userUpdateArgs: Prisma.UserUpdateArgs = {
              select: {
                ...request.server.prismaPlugin.getUserSelect(),
                firebaseUid: true,
                description: true
              },
              where: {
                firebaseUid: userFirebaseUid
              },
              data: request.body
            };

            // Update the user
            const userNext: User = await prismaClient.user.update(userUpdateArgs);

            //! Define rollback action for Algolia update user object
            requestRollback.userIndexObject = async (): Promise<void> => {
              await request.server.algolia.partialUpdateObject({
                indexName: 'user',
                objectID: userFirebaseUid,
                attributesToUpdate: userIndexObject
              });
            };

            // Update object in Algolia user index
            await request.server.algolia.partialUpdateObject({
              indexName: 'user',
              objectID: userFirebaseUid,
              attributesToUpdate: {
                ...request.server.helperPlugin.mapObjectValuesToNull(userNext),
                objectID: String(userNext.firebaseUid),
                updatedAt: userNext.updatedAt,
                updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(userNext.updatedAt)
              }
            });

            // Check if there are results in the fetched categories index objects
            if (categoryIndexObjects?.results.length) {
              //! Define rollback action for Algolia update categories objects
              requestRollback.categoriesIndexObjects = async (): Promise<void> => {
                await request.server.algolia.batch({
                  indexName: 'category',
                  batchWriteParams: {
                    requests: categoryIndexObjects.results.map((categoryIndexObject: any) => ({
                      action: 'partialUpdateObject',
                      body: categoryIndexObject
                    }))
                  }
                });
              };

              // Update object in Algolia category index object
              await request.server.algolia.batch({
                indexName: 'category',
                batchWriteParams: {
                  requests: categoryIndexObjects.results.map((categoryIndexObject: any) => ({
                    action: 'partialUpdateObject',
                    body: {
                      ...request.server.helperPlugin.mapObjectValuesToNull(categoryIndexObject),
                      user: {
                        ...categoryIndexObject.user,
                        avatar: userNext.avatar,
                        name: userNext.name
                      }
                    }
                  }))
                }
              });
            }

            // Define the arguments for update Firebase user auth record
            await request.server.auth.updateUser(userFirebaseUid, {
              displayName: (request.body.name as any) || null,
              photoURL: (request.body.avatar as any) || null
            });

            //! Restore user Auth record
            requestRollback.userRecord = async (): Promise<void> => {
              await request.server.auth.updateUser(userFirebaseUid, {
                displayName: userRecord.displayName,
                photoURL: userRecord.photoURL
              });
            }

            // Return the user
            return userNext;
          }).then((user: User) => {
            // Send success response with updated user
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
