/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Category, Post, Prisma, PrismaClient, PrismaPromise } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { DocumentData, WriteResult } from 'firebase-admin/lib/firestore';
import { parse } from 'path';

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
            type: 'number'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                message: {
                  type: 'string'
                }
              }
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
      const rollback: any = {};

      // prettier-ignore
      await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Category> => {
        const userId: number = Number(request.user.id);
        const userFirebaseUid: string = String(request.user.firebaseUid);
        const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');

        const categoryId: number = Number(request.params.id);
        const categoryPostListMoveTo: number = Number(request.query.categoryId);
        const categoryPostList = async (): Promise<PrismaPromise<any>> => {
          if (categoryPostListMoveTo) {
            const postUpdateManyArgs: Prisma.PostUpdateManyArgs = {
              where: {
                userId,
                categoryId
              },
              data: {
                categoryId: categoryPostListMoveTo
              }
            };

            return prismaClient.post
              .updateMany(postUpdateManyArgs)
              .catch(() => {
                throw new Error('fastify/prisma/failed-update-post');
              });
          } else {
            /** Get post list (delete preparations) */

            const postFindManyArgs: Prisma.PostFindManyArgs = {
              select: {
                firebaseUid: true
              },
              where: {
                userId,
                categoryId
              }
            };

            const postList: Post[] = await prismaClient.post
              .findMany(postFindManyArgs)
              .catch(() => {
                throw new Error('fastify/prisma/failed-find-many-post');
              });

            /** Delete category related post Firestore documents */

            const postListDocumentReference: DocumentReference[] = postList
              .map((post: Post) => ['users', userFirebaseUid, 'posts', post.firebaseUid].join('/'))
              .map((documentPath: string) => request.server.firestoreService.getDocumentReference(documentPath));

            const postListDocumentSnapshot: DocumentSnapshot[] = await Promise
              .all(postListDocumentReference.map(async (documentReference: DocumentReference): Promise<DocumentSnapshot> => documentReference.get()))
              .catch(() => {
                throw new Error('fastify/firestore/failed-get-all-post');
              });

            //! Firestore post list documents rollback

            rollback.postListDocument = async (): Promise<void> => {
              await Promise.all(postListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => {
                const documentSnapshot: DocumentSnapshot | undefined = postListDocumentSnapshot.find((snapshot: DocumentSnapshot) => {
                  return snapshot.id === documentReference.id
                });

                return documentReference.set(documentSnapshot?.data() as DocumentData);
              }));
            };

            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postListDocumentDelete: WriteResult[] = await Promise
              .all(postListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => documentReference.delete()))
              .catch(() => {
                throw new Error('fastify/firestore/failed-delete-post');
              });

            /** Delete category related post Markdown images */

            const markdownImageListDeletedPostList: string[][] = postListDocumentSnapshot
              .map((documentSnapshot: DocumentSnapshot) => documentSnapshot.data())
              .map((documentData: DocumentData | undefined) => documentData?.markdownImageList);

            const markdownImageListDeletedTempList: string[][] = await Promise
              .all(markdownImageListDeletedPostList.map(async (markdownImageListDeletedPost: string[]): Promise<string[]> => {
                return request.server.storageService.setImageListMoveTo(markdownImageListDeletedPost, userTemp);
              }))
              .catch(() => {
                throw new Error('fastify/storage/failed-move-post-image-to-temp');
              });

            //! Storage post list files rollback

            rollback.tempListStorage = async (): Promise<void> => {
              await Promise.all(markdownImageListDeletedTempList.map(async (markdownImageListDeletedTemp: string[], i: number): Promise<string[]> => {
                return request.server.storageService.setImageListMoveTo(markdownImageListDeletedTemp, parse(markdownImageListDeletedPostList[i][0]).dir);
              }));
            };

            /** Delete category related post list */

            const postDeleteManyArgs: Prisma.PostDeleteManyArgs = {
              where: {
                userId,
                categoryId
              }
            };

            return prismaClient.post.deleteMany(postDeleteManyArgs);
          }
        }

        /** Post handler (update or delete) */

        await categoryPostList();

        /** Delete category */

        const categoryDeleteArgs: Prisma.CategoryDeleteArgs = {
          where: {
            id: categoryId,
            userId
          }
        };

        return prismaClient.category.delete(categoryDeleteArgs);
      }).then((category: Category) => {
        //* Success

        return reply.status(200).send({
          data: category,
          statusCode: 200
        });
      }).catch(async (error: any) => {
        await Promise.allSettled(Object.values(rollback)
          .map(async (callback: any) => callback()))
          .then(() => {
            //! Failed

            return reply.status(500).send({
              code: error.message,
              error: 'Internal Server Error',
              statusCode: 500
            });
          });
      })
    }
  });
}
