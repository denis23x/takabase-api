/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post, Prisma, PrismaClient } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';

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
      const transaction: any = {};

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
            throw new Error('fastify/prisma/failed-delete-post');
          });

        const userFirebaseUid: string = request.user.firebaseUid;
        const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');
        const postFirebaseUid: string = post.firebaseUid;
        const postPath: string = ['users', userFirebaseUid, 'posts', postFirebaseUid].join('/');

        /** Delete related Firestore document */

        const postDocumentReference: DocumentReference = request.server.firestoreService.getDocumentReference(postPath);
        const postDocumentSnapshot: DocumentSnapshot = await postDocumentReference
          .get()
          .catch(() => {
            throw new Error('fastify/firestore/failed-get-post');
          })

        //! Firestore document rollback

        transaction.rollbackPostDocument = async (): Promise<void> => {
          await postDocumentReference.set(postDocumentSnapshot.data() as DocumentData)
        };

        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const postDocumentDelete: WriteResult = await postDocumentReference
          .delete()
          .catch(() => {
            throw new Error('fastify/firestore/failed-delete-post');
          });

        /** Delete not used images */

        const markdownImageListUpdatedPost: string[] = await request.server.storageService
          .getImageListPost(userFirebaseUid, postFirebaseUid)
          .catch(() => {
            throw new Error('fastify/storage/failed-read-file-list');
          });

        const markdownImageListUpdatedTemp: string[] = await request.server.storageService
          .setImageListMoveTo(markdownImageListUpdatedPost, userTemp)
          .catch(() => {
            throw new Error('fastify/storage/failed-move-post-image-to-temp');
          });

        //! Storage files rollback

        transaction.rollbackTempStorage = async (): Promise<void> => {
          await request.server.storageService.setImageListMoveTo(markdownImageListUpdatedTemp, postPath);
        };

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
          await Promise.allSettled(Object.values(transaction)
            .map(async (rollback: any) => rollback()))
            .then(() => {
              //! Failed

              return reply.status(500).send({
                code: error.message,
                error: 'Internal Server Error',
                statusCode: 500
              })
            });
        })
    }
  });
}
