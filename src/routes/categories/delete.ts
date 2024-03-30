/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Category, Post, Prisma, PrismaClient } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { DocumentData, WriteResult } from 'firebase-admin/lib/firestore';
import { parse } from 'path';
import { ResponseError } from '../../types/crud/response/response-error.schema';

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
            type: 'number',
            minimum: 1
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              $ref: 'categorySchema#'
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

      const categoryId: number = Number(request.params.id);
      const categoryPostListMoveTo: number = Number(request.query.categoryId);
      const categoryPostList: Post[] = [];
      const categoryPostListDocumentReference: DocumentReference[] = [];
      const categoryPostListDocumentSnapshot: DocumentSnapshot[] = [];

      //* Make post deleting preparations before start transaction (if not move them to another category)

      if (!categoryPostListMoveTo) {
        //* Get postList[]

        const postFindManyArgs: Prisma.PostFindManyArgs = {
          select: {
            firebaseUid: true
          },
          where: {
            userId,
            categoryId
          }
        };

        const postList: Post[] = await request.server.prisma.post.findMany(postFindManyArgs);

        categoryPostList.push(...postList);

        //* Get postListDocumentReference[]

        const postListDocumentReference: DocumentReference[] = categoryPostList
          .map((post: Post) => ['users', userFirebaseUid, 'posts', post.firebaseUid].join('/'))
          .map((documentPath: string) => request.server.firestorePlugin.getDocumentReference(documentPath));

        categoryPostListDocumentReference.push(...postListDocumentReference);

        //* Get postListDocumentSnapshot[]

        // prettier-ignore
        const postListDocumentSnapshot: DocumentSnapshot[] = await Promise
          .all(postListDocumentReference.map(async (documentReference: DocumentReference): Promise<DocumentSnapshot> => documentReference.get()))
          .catch(() => {
            throw new Error('fastify/firestore/failed-get-all-post');
          });

        categoryPostListDocumentSnapshot.push(...postListDocumentSnapshot);
      }

      //? Transaction

      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Category> => {
            requestRollback = {};

            if (!categoryPostListMoveTo) {
              /** Delete category related post Firestore documents */

              requestRollback.postListDocument = async (): Promise<void> => {
                await Promise.all(categoryPostListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => {
                  const documentSnapshot: DocumentSnapshot | undefined = categoryPostListDocumentSnapshot.find((snapshot: DocumentSnapshot) => {
                    return snapshot.id === documentReference.id
                  });

                  return documentReference.set(documentSnapshot?.data() as DocumentData);
                }));
              };

              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postListDocumentDelete: WriteResult[] = await Promise
                .all(categoryPostListDocumentReference.map(async (documentReference: DocumentReference): Promise<WriteResult> => documentReference.delete()))
                .catch(() => {
                  throw new Error('fastify/firestore/failed-delete-post');
                });

              /** Delete category related post Markdown images */

              const postListMarkdownImageList: string[][] = categoryPostListDocumentSnapshot
                .map((documentSnapshot: DocumentSnapshot) => documentSnapshot.data())
                .map((documentData: DocumentData | undefined) => documentData?.markdownImageList);

              const tempListMarkdownImageList: string[][] = await Promise
                .all(postListMarkdownImageList.map(async (postMarkdownImageList: string[]): Promise<string[]> => {
                  return request.server.storagePlugin.setImageListMoveTo(postMarkdownImageList, userTemp);
                }))
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-post-image-to-temp');
                });

              requestRollback.tempListStorage = async (): Promise<void> => {
                await Promise.all(tempListMarkdownImageList.map(async (tempMarkdownImageList: string[], i: number): Promise<string[]> => {
                  return request.server.storagePlugin.setImageListMoveTo(tempMarkdownImageList, parse(postListMarkdownImageList[i][0]).dir);
                }));
              };

              /** Delete category related post list */

              const postDeleteManyArgs: Prisma.PostDeleteManyArgs = {
                where: {
                  userId,
                  categoryId
                }
              };

              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postList: Prisma.BatchPayload = await prismaClient.post.deleteMany(postDeleteManyArgs);
            } else {
              /** Update category related post list */

              const postUpdateManyArgs: Prisma.PostUpdateManyArgs = {
                where: {
                  userId,
                  categoryId
                },
                data: {
                  categoryId: categoryPostListMoveTo
                }
              };

              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postList: Prisma.BatchPayload = await prismaClient.post.updateMany(postUpdateManyArgs);
            }

            /** Delete category */

            const categoryDeleteArgs: Prisma.CategoryDeleteArgs = {
              select: {
                ...request.server.prismaPlugin.getCategorySelect(),
              },
              where: {
                id: categoryId,
                userId
              }
            };

            return prismaClient.category.delete(categoryDeleteArgs);
          }).then((category: Category) => {
            return reply.status(200).send({
              data: category,
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
