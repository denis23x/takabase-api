/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Category, Prisma, PrismaClient, User } from '../../database/client';
import type { UserUpdateDto } from '../../types/dto/user/user-update';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { GetObjectsResponse } from '@algolia/client-search';
import type { SearchIndex } from 'algoliasearch';
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
            $ref: 'partsFirebaseUrlStorageSchema#'
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
      const userIndex: SearchIndex = request.server.algolia.initIndex('user');
      const userIndexObjects: GetObjectsResponse<any> = await userIndex.getObjects([userFirebaseUid]);
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
                .setImageListMove(tempAvatarList, 'avatars')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for avatar to move it to the /temp back
              requestRollback.userAvatarList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(userAvatarList, 'temp');
              };

              // Replace the avatar URL in the request body with the new URL
              request.body.avatar = request.server.markdownPlugin.getImageListReplace(userAvatar, tempAvatarList, userAvatarList);
            }

            // If there is a previous avatar exists
            if (userAvatar === null || userAvatar !== user.avatar) {
              // Get the avatar relative URL
              const userPreviousAvatarList: string[] = request.server.markdownPlugin.getImageListFromBucket([user.avatar]);

              // Move the previous and unworthy avatar to the /temp
              const tempPreviousAvatarList: string[] = await request.server.storagePlugin
                .setImageListMove(userPreviousAvatarList, 'temp')
                .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

              //! Define rollback action for avatar to move it to the /avatars back
              requestRollback.tempAvatarList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempPreviousAvatarList, 'avatars');
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
              const categoryList: Category[] = await request.server.prisma.category.findMany(categoryFindManyArgs);
              const categoryIndex: SearchIndex = request.server.algolia.initIndex('category');
              const categoryIndexIDs: string[] = categoryList.map((category: Category) => String(category.id));
              const categoryIndexObjects: GetObjectsResponse<any> = await categoryIndex.getObjects([...categoryIndexIDs]);

              // Check if there are results in the fetched categories index objects
              if (categoryIndexObjects.results.length) {
                //! Define rollback action for Algolia update categories objects
                requestRollback.categoriesIndexObjects = async (): Promise<void> => {
                  await categoryIndex.partialUpdateObjects([...categoryIndexObjects.results]);
                };

                // Update object in Algolia category index object
                await categoryIndex.partialUpdateObjects([...categoryIndexObjects.results.map((category: any) => ({
                  ...request.server.helperPlugin.mapObjectValuesToNull(category),
                  user: {
                    ...category.user,
                    avatar: userNext.avatar,
                    name: userNext.name
                  }
                }))]);
              }
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

            // Check if there are results in the fetched user index objects
            if (userIndexObjects.results.length) {
              //! Define rollback action for Algolia update user object
              requestRollback.userIndexObjects = async (): Promise<void> => {
                await userIndex.partialUpdateObjects([...userIndexObjects.results]);
              };

              // Update object in Algolia user index
              await userIndex.partialUpdateObjects([{
                ...request.server.helperPlugin.mapObjectValuesToNull(userNext),
                objectID: String(userNext.firebaseUid),
                updatedAt: userNext.updatedAt,
                updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(userNext.updatedAt),
              }]);
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
