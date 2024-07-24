/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Category, Post, Prisma, PrismaClient, User } from '../../database/client';
import { UserUpdateDto } from '../../types/dto/user/user-update';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { ChunkedBatchResponse, GetObjectsResponse, SaveObjectResponse } from '@algolia/client-search';
import { SearchIndex } from 'algoliasearch';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    preValidation: fastify.verifyUsername,
    schema: {
      tags: ['Users'],
      description: 'Updates a User',
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
      const userId: number = Number(request.params.id);
      const username: string = String(request.body.name || '');
      const userAvatar: string = String(request.body.avatar || '');
      const userIndex: SearchIndex = request.server.algolia.initIndex('user');
      const userIndexObjects: GetObjectsResponse<any> = await userIndex.getObjects([String(userId)]);

      // Define the arguments for find a user
      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: {
          avatar: true,
          name: true
        },
        where: {
          id: userId,
          firebaseUid: userFirebaseUid
        }
      };

      // User previous state
      const user: User = await request.server.prisma.user.findUniqueOrThrow(userFindUniqueOrThrowArgs);
      const userAlgoliaHandler: any = {};
      const userStorageHandler: any = {};

      // Fill the userAlgoliaHandler if is changed a username or avatar
      if (user.avatar !== userAvatar || user.name !== username) {
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

        userAlgoliaHandler.categoryIndex = categoryIndex;
        userAlgoliaHandler.categoryIndexIDs = categoryIndexIDs;
        userAlgoliaHandler.categoryIndexObjects = categoryIndexObjects;

        // Define the arguments for finding posts
        const postFindManyArgs: Prisma.PostFindManyArgs = {
          select: {
            id: true
          },
          where: {
            userFirebaseUid
          }
        };

        // Retrieve the list of posts from the MySQL and Algolia
        const postList: Post[] = await request.server.prisma.post.findMany(postFindManyArgs);
        const postIndex: SearchIndex = request.server.algolia.initIndex('post');
        const postIndexIDs: string[] = postList.map((post: Post) => String(post.id));
        const postIndexObjects: GetObjectsResponse<any> = await postIndex.getObjects([...postIndexIDs]);

        userAlgoliaHandler.postIndex = postIndex;
        userAlgoliaHandler.postIndexIDs = postIndexIDs;
        userAlgoliaHandler.postIndexObjects = postIndexObjects;
      }

      // Fill the userStorageHandler if is changed an avatar
      if (user.avatar !== userAvatar) {
        // Create the destination path for the user avatar
        const userAvatarStorageListDestination: string = ['users', userFirebaseUid, 'avatar'].join('/');

        // Retrieve the list of user avatars from the storage
        // prettier-ignore
        const userAvatarStorageList: string[] = await request.server.storagePlugin
          .getImageList(userAvatarStorageListDestination)
          .catch((error: any) => request.server.helperPlugin.throwError('storage/get-filelist-failed', error, request));

        // Define a function to set the user avatar and move unused avatar to temporary storage
        const userAvatarStorage = async (userAvatarNext: string | null): Promise<string | null> => {
          // Filter out the unused user avatar URL
          const userAvatarListUnused: string[] = userAvatarStorageList.filter(
            (userAvatarStorage: string) => userAvatarStorage !== userAvatarNext
          );

          // Move the unused avatar to temporary storage
          const tempAvatarList: string[] = await request.server.storagePlugin
            .setImageListMove(userAvatarListUnused, 'temp')
            .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

          //! Define rollback action for user avatar moved to temporary storage
          requestRollback.tempAvatarList = async (): Promise<void> => {
            await request.server.storagePlugin.setImageListMove(tempAvatarList, userAvatarStorageListDestination);
          };

          return userAvatarNext;
        };

        userStorageHandler.userAvatarStorageListDestination = userAvatarStorageListDestination;
        userStorageHandler.userAvatarStorageList = userAvatarStorageList;
        userStorageHandler.userAvatarStorage = userAvatarStorage;
      }

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

            // Check if the userStorageHandler is filled
            if (Object.keys(userStorageHandler).length) {
              // If there is a new avatar image
              if (userAvatar) {
                const userAvatarStorage: boolean = userStorageHandler.userAvatarStorageList.some((userAvatarStorage: string) => {
                  return decodeURIComponent(userAvatar).includes(userAvatarStorage);
                });

                // Check if the user avatar is stored in any of the specified locations
                if (!userAvatarStorage) {
                  // Extract the new avatar URL with the appropriate destination
                  const updatedTempAvatarList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([userAvatar]);

                  // Move the updated avatar to the user avatar destination
                  const updatedUserAvatarList: string[] = await request.server.storagePlugin
                    .setImageListMove(updatedTempAvatarList, userStorageHandler.userAvatarStorageListDestination)
                    .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error, request));

                  //! Define rollback action for moving user avatar to destination
                  requestRollback.updatedUserAvatarList = async (): Promise<void> => {
                    await request.server.storagePlugin.setImageListMove(updatedUserAvatarList, 'temp');
                  };

                  // Set the request body avatar with the updated user avatar
                  request.body.avatar = request.server.markdownPlugin.getImageListRewrite(userAvatar, updatedTempAvatarList, updatedUserAvatarList);

                  // @ts-ignore
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const updatedUserAvatar: string = await userStorageHandler.userAvatarStorage(decodeURIComponent([...updatedUserAvatarList].shift()));
                }
              } else {
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const updatedUserAvatar: null = await userStorageHandler.userAvatarStorage(null);
              }
            }

            // Define the arguments for updating user
            const userUpdateArgs: Prisma.UserUpdateArgs = {
              select: {
                ...request.server.prismaPlugin.getUserSelect(),
                description: true
              },
              where: {
                id: userId,
                firebaseUid: userFirebaseUid
              },
              data: request.body
            };

            // Update the user
            const user: User = await prismaClient.user.update(userUpdateArgs);

            // Check if there are results in the fetched user index objects
            if (userIndexObjects.results.length) {
              //! Define rollback action for Algolia update user object
              requestRollback.userIndexObjects = async (): Promise<void> => {
                await userIndex.partialUpdateObjects([...userIndexObjects.results]);
              };

              // Update object in Algolia user index
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const userIndexObject: SaveObjectResponse = await userIndex.partialUpdateObjects([{
                ...request.server.helperPlugin.mapObjectValuesToNull(user),
                objectID: String(user.id),
                updatedAt: user.updatedAt,
                updatedAtUnixTimestamp: request.server.algoliaPlugin.getUnixTimestamp(user.updatedAt),
              }]);
            }

            // Check if the userAlgoliaHandler is filled
            if (Object.keys(userAlgoliaHandler).length) {
              // Check if there are results in the fetched categories index objects
              if (userAlgoliaHandler.categoryIndexObjects.results.length) {
                //! Define rollback action for Algolia update categories objects
                requestRollback.categoriesIndexObjects = async (): Promise<void> => {
                  await userAlgoliaHandler.categoryIndex.partialUpdateObjects([...userAlgoliaHandler.categoryIndexObjects.results]);
                };

                // Map the results from the post index objects to create a new array of posts
                const categoryIndexObjects: Partial<Category>[] = userAlgoliaHandler.categoryIndexObjects.results.map((category: any) => ({
                  ...category,
                  user: {
                    ...category.user,
                    avatar: user.avatar,
                    name: user.name
                  }
                }));

                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const categoryIndexObjectsUpdate: ChunkedBatchResponse = await userAlgoliaHandler.categoryIndex.partialUpdateObjects([...categoryIndexObjects]);
              }

              // Check if there are results in the fetched posts index objects
              if (userAlgoliaHandler.postIndexObjects.results.length) {
                //! Define rollback action for Algolia update posts objects
                requestRollback.postsIndexObjects = async (): Promise<void> => {
                  await userAlgoliaHandler.postIndex.partialUpdateObjects([...userAlgoliaHandler.postIndexObjects.results]);
                };

                // Map the results from the post index objects to create a new array of posts
                const postIndexObjects: Partial<Post>[] = userAlgoliaHandler.postIndexObjects.results.map((post: any) => ({
                  ...post,
                  user: {
                    ...post.user,
                    avatar: user.avatar,
                    name: user.name
                  }
                }));

                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const postIndexObjectsUpdate: ChunkedBatchResponse = await userAlgoliaHandler.postIndex.partialUpdateObjects([...postIndexObjects]);
              }
            }

            // Return the user
            return user;
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
