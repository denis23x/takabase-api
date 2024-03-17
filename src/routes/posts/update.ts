/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post, PrismaClient } from '../../database/client';
import { PostUpdateDto } from '../../types/dto/post/post-update';
import { DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/firestore';

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
      const transactionRollback: any = {};

      // prettier-ignore
      await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
        const userFirebaseUid: string = request.user.firebaseUid;
        const postMarkdown: string = String(request.body.markdown || '');
        const postFirebaseUid: string = String(request.body.firebaseUid || '');

        //! Rollback cooking

        transactionRollback.userFirebaseUid = userFirebaseUid;
        transactionRollback.postFirebaseUid = postFirebaseUid;

        /** Move image temp to post */

        const markdownImageListBody: string[] = request.server.markdownService.getImageList(postMarkdown);
        const markdownImageListTemp: string[] = request.server.markdownService.getImageListTemp(markdownImageListBody);
        const markdownImageListMoveTempToPost: string[] = await request.server.storageService
          .setImageListMoveTempToPost(postFirebaseUid, markdownImageListTemp)
          .catch(() => {
            throw new Error('fastify/storage/failed-move-temp-image-to-post', {
              cause: {
                code: 'fastify/storage/failed-move-temp-image-to-post',
                error: 'Internal Server Error',
                statusCode: 500
              }
            });
          });

        //! Rollback cooking

        transactionRollback.markdownImageListPostToTemp = markdownImageListMoveTempToPost.map((imageUrl: string) => decodeURIComponent(imageUrl));

        /** Delete not used images */

        const markdownImageListUpdated: string = request.server.markdownService.getImageListRewrite(postMarkdown, markdownImageListTemp, markdownImageListMoveTempToPost);
        const markdownImageListUpdatedBody: string[] = request.server.markdownService.getImageList(markdownImageListUpdated);
        const markdownImageListUpdatedPost: string[] = request.server.markdownService.getImageListPost(markdownImageListUpdatedBody);
        const markdownImageListUpdatedPostStorage: string[] = await request.server.storageService.getImageListPost(userFirebaseUid, postFirebaseUid);
        const markdownImageListUpdatedTemp: string[] = markdownImageListUpdatedPostStorage.filter((imageStorageUrl: string) => !markdownImageListUpdatedPost.includes(encodeURIComponent(imageStorageUrl)));
        const markdownImageListUpdatedMovePostToTemp: string[] = await request.server.storageService
          .setImageListMovePostToTemp(postFirebaseUid, markdownImageListUpdatedTemp)
          .catch(() => {
            throw new Error('fastify/storage/failed-move-post-image-to-temp', {
              cause: {
                code: 'fastify/storage/failed-move-post-image-to-temp',
                error: 'Internal Server Error',
                statusCode: 500
              }
            });
          });

        /** Update related Firestore document */

        const markdownImageList: string[] = markdownImageListUpdatedPost.map((imageUrl: string) => decodeURIComponent(imageUrl));

        //! Rollback cooking

        transactionRollback.markdownImageListTempToPost = markdownImageListUpdatedMovePostToTemp.map((imageUrl: string) => decodeURIComponent(imageUrl));;

        const postDocumentPath: string = '/users/' + userFirebaseUid + '/posts/' + postFirebaseUid;
        const postDocumentReference: DocumentReference = request.server.firestoreService.getDocumentReference(postDocumentPath);
        const postDocumentSnapshot: DocumentSnapshot = await postDocumentReference.get();

        //! Rollback cooking

        transactionRollback.postDocumentReference = postDocumentReference;
        transactionRollback.postDocumentSnapshot = postDocumentSnapshot;

        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const postDocumentUpdate: WriteResult = await postDocumentReference
          .update({ markdownImageList })
          .catch(() => {
            throw new Error('fastify/firestore/failed-update-post', {
              cause: {
                code: 'fastify/firestore/failed-update-post',
                error: 'Internal Server Error',
                statusCode: 500
              }
            });
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
            throw new Error('fastify/prisma/failed-update-post', {
              cause: {
                code: 'fastify/prisma/failed-update-post',
                error: 'Internal Server Error',
                statusCode: 500
              }
            });
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
        const setRollback = (): Promise<unknown> => {
          switch (error.cause.code) {
            case 'fastify/storage/failed-move-temp-image-to-post': {
              return reply.server.storageService.setImageListMovePostToTemp(transactionRollback.postFirebaseUid, transactionRollback.markdownImageListPostToTemp);
            }
            case 'fastify/storage/failed-move-post-image-to-temp': {
              return reply.server.storageService.setImageListMoveTempToPost(transactionRollback.postFirebaseUid, transactionRollback.markdownImageListTempToPost);
            }
            case 'fastify/firestore/failed-update-post': {
              return Promise.all([
                reply.server.storageService.setImageListMovePostToTemp(transactionRollback.postFirebaseUid, transactionRollback.markdownImageListPostToTemp),
                reply.server.storageService.setImageListMoveTempToPost(transactionRollback.postFirebaseUid, transactionRollback.markdownImageListTempToPost)
              ]);
            }
            case 'fastify/prisma/failed-update-post': {
              return Promise.all([
                transactionRollback.postDocumentReference.set(transactionRollback.postDocumentSnapshot.data()),
                reply.server.storageService.setImageListMovePostToTemp(transactionRollback.postFirebaseUid, transactionRollback.markdownImageListPostToTemp),
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
