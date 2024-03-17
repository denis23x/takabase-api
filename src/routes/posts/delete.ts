/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post, Prisma, PrismaClient } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Posts'],
      description: 'Removes specific Post from the database',
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
              $ref: 'postSchema#'
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
      const transactionOptions: any = request.server.prismaService.getTransactionOptions();
      const transactionRollback: any = {};

      // prettier-ignore
      await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
        /** Delete MySQL row */

        const postDeleteArgs: Prisma.PostDeleteArgs = {
          select: {
            ...request.server.prismaService.getPostSelect(),
          },
          where: {
            userId: Number(request.user.id),
            id: Number(request.params.id)
          }
        };

        const post: Post = await prismaClient.post
          .delete(postDeleteArgs)
          .catch(() => {
            throw new Error('fastify/prisma/failed-delete-post', {
              cause: {
                code: 'fastify/prisma/failed-delete-post',
                error: 'Internal Server Error',
                statusCode: 500
              }
            });
          });

        const userFirebaseUid: string = request.user.firebaseUid;
        const postFirebaseUid: string = post.firebaseUid;

        //! Rollback cooking

        transactionRollback.userFirebaseUid = userFirebaseUid;
        transactionRollback.postFirebaseUid = post.firebaseUid;

        /** Delete related Firestore document */

        const postDocumentPath: string = '/users/' + userFirebaseUid + '/posts/' + postFirebaseUid;
        const postDocumentReference: DocumentReference = request.server.firestoreService.getDocumentReference(postDocumentPath);
        const postDocumentSnapshot: DocumentSnapshot = await postDocumentReference.get();

        //! Rollback cooking

        transactionRollback.postDocumentReference = postDocumentReference;
        transactionRollback.postDocumentSnapshot = postDocumentSnapshot;

        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const postDocumentDelete: WriteResult = await postDocumentReference
          .delete()
          .catch(() => {
            throw new Error('fastify/firestore/failed-delete-post', {
              cause: {
                code: 'fastify/firestore/failed-delete-post',
                error: 'Internal Server Error',
                statusCode: 500
              }
            });
          });

        /** Delete not used images */

        const markdownImageListUpdatedPostStorage: string[] = await request.server.storageService.getImageListPost(userFirebaseUid, postFirebaseUid);
        const markdownImageListUpdatedMovePostToTemp: string[] = await request.server.storageService
          .setImageListMovePostToTemp(postFirebaseUid, markdownImageListUpdatedPostStorage)
          .catch(() => {
            throw new Error('fastify/storage/failed-move-post-image-to-temp', {
              cause: {
                code: 'fastify/storage/failed-move-post-image-to-temp',
                error: 'Internal Server Error',
                statusCode: 500
              }
            });
          });

        //! Rollback cooking

        transactionRollback.markdownImageListTempToPost = markdownImageListUpdatedMovePostToTemp.map((imageUrl: string) => decodeURIComponent(imageUrl));

        /** Response to client */

        return post;
      }, transactionOptions)
        .then((post: Post) => {
          //* Success

          return reply.status(200).send({
            data: post,
            statusCode: 200
          });
        })
        .catch(async (error: any) => {
          console.log(error);

          const setRollback = (): Promise<unknown> => {
            switch (error.cause.code) {
              // case 'fastify/prisma/failed-delete-post':
              // case 'fastify/firestore/failed-delete-post':
              case 'fastify/storage/failed-move-post-image-to-temp': {
                return Promise.all([
                  transactionRollback.postDocumentReference.set(transactionRollback.postDocumentSnapshot.data()),
                  reply.server.storageService.setImageListMoveTempToPost(transactionRollback.postFirebaseUid, transactionRollback.markdownImageListTempToPost)
                ]);
              }
              default: {
                return new Promise((resolve) => resolve(undefined));
              }
            }
          };

          /** Send error */

          await setRollback().then(() => {
            return reply.status(error.cause.statusCode).send(error.cause);
          });
        })
    }
  });
}
