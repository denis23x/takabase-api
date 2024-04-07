/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, PrismaClient, User } from '../../database/client';
import { UserUpdateDto } from '../../types/dto/user/user-update';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Users'],
      description: 'Updates a User',
      security: [
        {
          Authorization: []
        }
      ],
      params: {
        $ref: 'paramsIdSchema#'
      },
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            pattern: '^\\S*$'
          },
          description: {
            type: 'string',
            nullable: true
          },
          avatar: {
            type: 'string',
            nullable: true
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
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
        400: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<UserUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract common information from request object
      const userId: number = Number(request.user.id);
      const userFirebaseUid: string = String(request.user.firebaseUid);
      const userAvatar: string | null | undefined = request.body.avatar as any;

      // Create the destination path for the user avatar
      const userAvatarListDestination: string = ['users', userFirebaseUid, 'avatar'].join('/');
      const userAvatarList: string[] = await request.server.storagePlugin
        .getImageList(userAvatarListDestination)
        .catch(() => {
          throw new Error('fastify/storage/failed-read-file-list');
        });

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

            // Define a function to set the user avatar and move unused avatar to temporary storage
            const setUserAvatar = async (userAvatarNext: string | null): Promise<string | null> => {
              // Filter out the unused user avatar URL
              const userAvatarListUnused: string[] = userAvatarList.filter((userAvatar: string) => userAvatar !== userAvatarNext);

              // Move the unused avatar to temporary storage
              const tempAvatarList: string[] = await request.server.storagePlugin
                .setImageListMove(userAvatarListUnused, 'temp')
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-user-avatar-to-temp');
                });

              //! Define rollback action for user avatar moved to temporary storage
              requestRollback.tempAvatarList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(tempAvatarList, userAvatarListDestination);
              };

              return userAvatarNext;
            };

            // If there is a post image
            if (userAvatar) {
              // Extract the new avatar URL with the appropriate destination
              const updatedTempAvatarList: string[] = request.server.markdownPlugin.getImageListRelativeUrl([userAvatar]);

              // Move the updated avatar to the user avatar destination
              const updatedUserAvatarList: string[] = await request.server.storagePlugin
                .setImageListMove(updatedTempAvatarList, userAvatarListDestination)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-temp-avatar-to-user');
                });

              //! Define rollback action for moving user avatar to destination
              requestRollback.updatedUserAvatarList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMove(updatedUserAvatarList, 'temp');
              };

              // Set the request body avatar with the updated user avatar
              request.body.avatar = request.server.markdownPlugin.getImageListRewrite(userAvatar, updatedTempAvatarList, updatedUserAvatarList);

              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const updatedUserAvatar: string = await setUserAvatar(decodeURIComponent([...updatedUserAvatarList].shift()));
            } else {
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const updatedUserAvatar: null = await setUserAvatar(null);
            }

            // Define the arguments for updating user
            const userUpdateArgs: Prisma.UserUpdateArgs = {
              select: {
                ...request.server.prismaPlugin.getUserSelect()
              },
              where: {
                id: userId
              },
              data: {
                ...request.body
              }
            };

            // Update the user
            return prismaClient.user.update(userUpdateArgs);
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
