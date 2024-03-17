/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post, PrismaClient } from '../../database/client';
import { PostUpdateDto } from '../../types/dto/post/post-update';
import { DocumentReference, DocumentSnapshot, DocumentData, WriteResult } from 'firebase-admin/firestore';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Posts'],
      description: 'Updates a Post',
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
          firebaseUid: {
            type: 'string'
          },
          name: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          markdown: {
            type: 'string'
          },
          image: {
            type: 'string',
            nullable: true
          },
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
    handler: async function (request: FastifyRequest<PostUpdateDto>, reply: FastifyReply): Promise<any> {
      const transactionOptions: any = request.server.prismaService.getTransactionOptions();
      const transaction: any = {};

      // prettier-ignore
      await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
        const userFirebaseUid: string = request.user.firebaseUid;
        const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');
        const postMarkdown: string = String(request.body.markdown || '');
        const postFirebaseUid: string = String(request.body.firebaseUid || '');
        const postPath: string = ['users', userFirebaseUid, 'posts', postFirebaseUid].join('/');

        /** Move image temp to post */

        const markdownImageListBody: string[] = request.server.markdownService.getImageList(postMarkdown);
        const markdownImageListTemp: string[] = request.server.markdownService.getImageListTemp(markdownImageListBody);
        const markdownImageListPost: string[] = await request.server.storageService
          .setImageListMoveTo(markdownImageListTemp, postPath)
          .catch(() => {
            throw new Error('fastify/storage/failed-move-temp-image-to-post');
          });

        //! Storage files rollback

        transaction.rollbackPostStorage = async (): Promise<void> => {
          await request.server.storageService.setImageListMoveTo(markdownImageListPost, userTemp);
        };

        /** Delete not used images */

        const markdownImageListUpdated: string = request.server.markdownService.getImageListRewrite(postMarkdown, markdownImageListTemp, markdownImageListPost);
        const markdownImageListUpdatedBody: string[] = request.server.markdownService.getImageList(markdownImageListUpdated);
        const markdownImageListUpdatedPost: string[] = request.server.markdownService.getImageListPost(markdownImageListUpdatedBody);
        const markdownImageListUpdatedUnused: string[] = await request.server.storageService
          .getImageListPost(userFirebaseUid, postFirebaseUid)
          .then((imageList: string[]) => imageList.filter((imageUrl: string) => !markdownImageListUpdatedPost.includes(encodeURIComponent(imageUrl))))
          .catch(() => {
            throw new Error('fastify/storage/failed-read-file-list');
          });

        const markdownImageListUpdatedTemp: string[] = await request.server.storageService
          .setImageListMoveTo(markdownImageListUpdatedUnused, userTemp)
          .catch(() => {
            throw new Error('fastify/storage/failed-move-post-image-to-temp');
          });

        //! Storage files rollback

        transaction.rollbackTempStorage = async (): Promise<void> => {
          await request.server.storageService.setImageListMoveTo(markdownImageListUpdatedTemp, postPath);
        };

        /** Get related Firestore document */

        const postDocumentReference: DocumentReference = request.server.firestoreService.getDocumentReference(postPath);
        const postDocumentSnapshot: DocumentSnapshot = await postDocumentReference
          .get()
          .catch(() => {
            throw new Error('fastify/firestore/failed-get-post');
          });

        //! Firestore document rollback

        transaction.rollbackPostDocument = async (): Promise<void> => {
          await postDocumentReference.set(postDocumentSnapshot.data() as DocumentData)
        };

        /** Update related Firestore document */

        const markdownImageList: string[] = markdownImageListUpdatedPost.map((imageUrl: string) => decodeURIComponent(imageUrl));

        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const postDocumentUpdate: WriteResult = await postDocumentReference
          .update({ markdownImageList })
          .catch(() => {
            throw new Error('fastify/firestore/failed-update-post');
          });

        /** Update MySQL row */

        const postUpdateArgs: Prisma.PostUpdateArgs = {
          select: {
            ...request.server.prismaService.getPostSelect(),
            category: {
              select: request.server.prismaService.getCategorySelect()
            },
            user: {
              select: request.server.prismaService.getUserSelect()
            }
          },
          where: {
            userId: Number(request.user.id),
            id: Number(request.params.id)
          },
          data: {
            ...request.body,
            markdown: markdownImageListUpdated,
          }
        };

        const post: Post = await prismaClient.post
          .update(postUpdateArgs)
          .catch(() => {
            throw new Error('fastify/prisma/failed-update-post');
          });

        /** Response to client */

        return post;
      }, transactionOptions).then((post: Post) => {
        //* Success

        return reply.status(200).send({
          data: post,
          statusCode: 200
        });
      }).catch(async (error: any) => {
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
