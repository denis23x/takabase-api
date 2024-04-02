/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post, Prisma, PrismaClient, User } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';
import { parse } from 'path';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Users'],
      description: 'Removes specific User from the database',
      security: [
        {
          Authorization: []
        }
      ],
      params: {
        $ref: 'paramsIdSchema#'
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
    handler: async function (request: FastifyRequest<ParamsId & QuerystringSearch>, reply: FastifyReply): Promise<any> {
      const MAX_RETRIES: number = 3;

      //* Common info

      const userId: number = Number(request.user.id);
      const userFirebaseUid: string = String(request.user.firebaseUid);
      const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');

      const userPostList: Post[] = [];
      const userPostListDocumentReference: DocumentReference[] = [];
      const userPostListDocumentSnapshot: DocumentSnapshot[] = [];

      //* Make post deleting preparations before start transaction

      //* Get postList[]

      const postFindManyArgs: Prisma.PostFindManyArgs = {
        select: {
          firebaseUid: true,
          image: true
        },
        where: {
          userId
        }
      };

      const postList: Post[] = await request.server.prisma.post.findMany(postFindManyArgs);

      userPostList.push(...postList);

      //* Get postListDocumentReference[]

      const postListDocumentReference: DocumentReference[] = userPostList
        .map((post: Post) => ['users', userFirebaseUid, 'posts', post.firebaseUid].join('/'))
        .map((documentPath: string) => request.server.firestorePlugin.getDocumentReference(documentPath));

      userPostListDocumentReference.push(...postListDocumentReference);

      //* Get postListDocumentSnapshot[]

      // prettier-ignore
      const postListDocumentSnapshot: DocumentSnapshot[] = await Promise
        .all(postListDocumentReference.map(async (documentReference: DocumentReference): Promise<DocumentSnapshot> => documentReference.get()))
        .catch(() => {
          throw new Error('fastify/firestore/failed-get-all-post');
        });

      userPostListDocumentSnapshot.push(...postListDocumentSnapshot);

      //? Transaction

      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<User> => {
            requestRollback = {};

            /** Delete User related Post Firestore documents */

            //! Firestore User related Post documents rollback

            requestRollback.postListDocument = async (): Promise<void> => {
              await Promise.all(userPostListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => {
                const documentSnapshot: DocumentSnapshot | undefined = userPostListDocumentSnapshot.find((snapshot: DocumentSnapshot) => {
                  return snapshot.id === documentReference.id
                });

                return documentReference.set(documentSnapshot?.data() as DocumentData);
              }));
            };

            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postListDocumentDelete: WriteResult[] = await Promise
              .all(userPostListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => documentReference.delete()))
              .catch(() => {
                throw new Error('fastify/firestore/failed-delete-post');
              });

            /** Move User related Post image to temp (delete) */

            const postListImageList: string[] = userPostList
              .filter((post: Post) => post.image)
              .map((post: Post) => post.image);

            if (postListImageList.length) {
              const postListImageListDestination: string[] = request.server.markdownPlugin.getImageListSubstringUrl(postListImageList);
              const tempListImageList: string[] = await request.server.storagePlugin
                .setImageListMoveTo(postListImageListDestination, userTemp)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-post-image-to-temp');
                });

              //! Storage User related Post image rollback

              requestRollback.tempListImageList = async (): Promise<void> => {
                await Promise.all(tempListImageList.map(async (tempImageList: string, i: number): Promise<string[]> => {
                  return request.server.storagePlugin.setImageListMoveTo([tempImageList], parse(decodeURIComponent(postListImageListDestination[i])).dir);
                }));
              };
            }

            /** Move User related Post Markdown image to temp (delete) */

            const postListMarkdownList: string[][] = userPostListDocumentSnapshot
              .map((documentSnapshot: DocumentSnapshot) => documentSnapshot.data())
              .filter((documentData: DocumentData | undefined) => documentData?.markdown)
              .map((documentData: DocumentData | undefined) => documentData?.markdown);

            if (postListMarkdownList.some((postMarkdownList: string[]) => postMarkdownList.length)) {
              const tempListMarkdownList: string[][] = await Promise
                .all(postListMarkdownList.map(async (postMarkdownList: string[]): Promise<string[]> => {
                  return request.server.storagePlugin.setImageListMoveTo(postMarkdownList, userTemp);
                }))
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-post-image-to-temp');
                });

              //! Storage User related Post Markdown images rollback

              requestRollback.tempListMarkdownList = async (): Promise<void> => {
                await Promise.all(tempListMarkdownList.map(async (tempMarkdownList: string[], i: number): Promise<string[]> => {
                  return request.server.storagePlugin.setImageListMoveTo(tempMarkdownList, parse(postListMarkdownList[i][0]).dir);
                }));
              };
            }

            /** Delete User related Post list */

            const postDeleteManyArgs: Prisma.PostDeleteManyArgs = {
              where: {
                userId
              }
            };

            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postList: Prisma.BatchPayload = await prismaClient.post.deleteMany(postDeleteManyArgs);

            /** Delete User related Category list */

            const categoryDeleteManyArgs: Prisma.CategoryDeleteManyArgs = {
              where: {
                userId
              }
            };

            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const categoryList: Prisma.BatchPayload = await prismaClient.category.deleteMany(categoryDeleteManyArgs);

            // TODO: delete user avatar
            // TODO: delete user document

            /** Delete User */

            const userDeleteArgs: Prisma.UserDeleteArgs = {
              select: {
                ...request.server.prismaPlugin.getUserSelect()
              },
              where: {
                id: userId
              }
            };

            return prismaClient.user.delete(userDeleteArgs);
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
