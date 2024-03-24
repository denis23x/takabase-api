/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post, PrismaClient } from '../../database/client';
import { PostUpdateDto } from '../../types/dto/post/post-update';
import { DocumentReference, DocumentSnapshot, DocumentData, WriteResult } from 'firebase-admin/firestore';
import { ResponseError } from '../../types/crud/response/response-error.schema';

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
      const MAX_RETRIES: number = 3;

      //* Common info

      const userFirebaseUid: string = request.user.firebaseUid;
      const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');
      const postMarkdown: string = String(request.body.markdown || '');
      const postFirebaseUid: string = String(request.body.firebaseUid || '');
      const postPath: string = ['users', userFirebaseUid, 'posts', postFirebaseUid].join('/');

      //? Transaction

      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
            requestRollback = {};

            /** Move image temp to post */

            const bodyMarkdownImageList: string[] = request.server.markdownService.getImageList(postMarkdown);
            const tempMarkdownImageList: string[] = request.server.markdownService.getImageListTemp(bodyMarkdownImageList);
            const postMarkdownImageList: string[] = await request.server.storageService
              .setImageListMoveTo(tempMarkdownImageList, postPath)
              .catch(() => {
                throw new Error('fastify/storage/failed-move-temp-image-to-post');
              });

            //! Storage files rollback

            requestRollback.postStorage = async (): Promise<void> => {
              await request.server.storageService.setImageListMoveTo(postMarkdownImageList, userTemp);
            };

            /** Delete not used images */

            const updatedPostMarkdown: string = request.server.markdownService.getImageListRewrite(postMarkdown, tempMarkdownImageList, postMarkdownImageList);
            const updatedBodyMarkdownImageList: string[] = request.server.markdownService.getImageList(updatedPostMarkdown);
            const updatedPostMarkdownImageList: string[] = request.server.markdownService.getImageListPost(updatedBodyMarkdownImageList);
            const updatedPostMarkdownImageListUnused: string[] = await request.server.storageService
              .getImageListPost(userFirebaseUid, postFirebaseUid)
              .then((imageList: string[]) => imageList.filter((imageUrl: string) => !updatedPostMarkdownImageList.includes(encodeURIComponent(imageUrl))))
              .catch(() => {
                throw new Error('fastify/storage/failed-read-file-list');
              });

            const updatedTempMarkdownImageList: string[] = await request.server.storageService
              .setImageListMoveTo(updatedPostMarkdownImageListUnused, userTemp)
              .catch(() => {
                throw new Error('fastify/storage/failed-move-post-image-to-temp');
              });

            //! Storage files rollback

            requestRollback.tempStorage = async (): Promise<void> => {
              await request.server.storageService.setImageListMoveTo(updatedTempMarkdownImageList, postPath);
            };

            /** Get related Firestore document */

            const postDocumentReference: DocumentReference = request.server.firestoreService.getDocumentReference(postPath);
            const postDocumentSnapshot: DocumentSnapshot = await postDocumentReference
              .get()
              .catch(() => {
                throw new Error('fastify/firestore/failed-get-post');
              });

            //! Firestore document rollback

            requestRollback.postDocument = async (): Promise<void> => {
              await postDocumentReference.set(postDocumentSnapshot.data() as DocumentData)
            };

            /** Update related Firestore document */

            const postDocumentUpdateDto: any = {
              markdownImageList: updatedPostMarkdownImageList.map((imageUrl: string) => decodeURIComponent(imageUrl))
            };

            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postDocumentUpdate: WriteResult = await postDocumentReference
              .update(postDocumentUpdateDto)
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
                markdown: updatedPostMarkdown,
              }
            };

            return prismaClient.post.update(postUpdateArgs)
          }).then((post: Post) => {
            return reply.status(200).send({
              data: post,
              statusCode: 200
            });
          });

          break;
        } catch (error: any) {
          requestRetries++;

          //! Rollback

          await Promise.allSettled(Object.values(requestRollback).map(async (rollback: any): Promise<any> => rollback()));

          //! Send error or retry

          const responseError: ResponseError | null = reply.server.prismaService.getErrorTransaction(error, requestRetries >= MAX_RETRIES);

          if (responseError) {
            return reply.status(responseError.statusCode).send(responseError);
          }
        }
      }
    }
  });
}
