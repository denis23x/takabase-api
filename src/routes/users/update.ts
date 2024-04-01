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
      const MAX_RETRIES: number = 3;

      //* Common info

      const userId: number = request.user.id;
      const userFirebaseUid: string = request.user.firebaseUid;
      const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');
      const userAvatar: string | null | undefined = request.body.avatar as any;

      //* Make post updating preparations before start transaction

      const userAvatarListDestination: string = ['users', userFirebaseUid, 'avatar'].join('/');
      const userAvatarList: string[] = await request.server.storagePlugin
        .getImageList(userAvatarListDestination)
        .catch(() => {
          throw new Error('fastify/storage/failed-read-file-list');
        });

      //? Transaction

      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<User> => {
            requestRollback = {};

            /** Move User previous avatar to temp (delete) */

            const setUserAvatar = async (userAvatarNext: string | null): Promise<string | null> => {
              const userAvatarListUnused: string[] = userAvatarList.filter((userAvatar: string) => userAvatar !== userAvatarNext);
              const tempAvatarList: string[] = await request.server.storagePlugin
                .setImageListMoveTo(userAvatarListUnused, userTemp)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-user-avatar-to-temp');
                });

              //! Storage User avatar rollback

              requestRollback.tempAvatarList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMoveTo(tempAvatarList, userAvatarListDestination);
              };

              return userAvatarNext;
            };

            /** Move User avatar to post (save) */

            if (userAvatar) {
              const updatedTempAvatarList: string[] = request.server.markdownPlugin.getImageListSubstringUrl([userAvatar]);
              const updatedUserAvatarList: string[] = await request.server.storagePlugin
                .setImageListMoveTo(updatedTempAvatarList, userAvatarListDestination)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-temp-avatar-to-user');
                });

              //! Storage User avatar rollback

              requestRollback.updatedUserAvatarList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMoveTo(updatedUserAvatarList, userTemp);
              };

              //* Set

              request.body.avatar = request.server.markdownPlugin.getImageListRewrite(userAvatar, updatedTempAvatarList, updatedUserAvatarList);

              /** Move User previous avatar to temp (delete) */

              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const updatedUserAvatar: string = await setUserAvatar(decodeURIComponent([...updatedUserAvatarList].shift()));
            } else {
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const updatedUserAvatar: null = await setUserAvatar(null);
            }

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

            return prismaClient.user.update(userUpdateArgs);
          }).then((user: User) => {
            return reply.status(200).send({
              data: user,
              statusCode: 200
            });
          });

          break;
        } catch (error: any) {
          requestRetries++;

          //! Rollback && Send error or pass further for retry

          const responseError: ResponseError | null = await reply.server.prismaPlugin.setErrorTransaction(error, requestRetries >= MAX_RETRIES, requestRollback);

          if (responseError) {
            return reply.status(responseError.statusCode).send(responseError);
          }
        }
      }
    }
  });
}
