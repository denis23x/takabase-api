/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post, Prisma, PrismaClient } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { DocumentData, DocumentReference, DocumentSnapshot, WriteResult } from 'firebase-admin/lib/firestore';
import { ResponseError } from '../../types/crud/response/response-error.schema';

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
      const MAX_RETRIES: number = 3;

      //* Common info

      const userFirebaseUid: string = request.user.firebaseUid;
      const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');

      //? Transaction

      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
            requestRollback = {};

            /** Delete MySQL row */

            const postDeleteArgs: Prisma.PostDeleteArgs = {
              select: {
                firebaseUid: true,
                image: true
              },
              where: {
                userId: Number(request.user.id),
                id: Number(request.params.id)
              }
            };

            const post: Post = await prismaClient.post.delete(postDeleteArgs);
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

            requestRollback.postDocument = async (): Promise<void> => {
              await postDocumentReference.set(postDocumentSnapshot.data() as DocumentData)
            };

            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postDocumentDelete: WriteResult = await postDocumentReference
              .delete()
              .catch(() => {
                throw new Error('fastify/firestore/failed-delete-post');
              });

            /** Move Post image to temp (delete) */

            if (post.image) {
              const postImageListDestination: string[] = request.server.markdownService.getImageListSubstringUrl([post.image]);
              const tempImageList: string[] = await request.server.storageService
                .setImageListMoveTo(postImageListDestination, userTemp)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-post-image-to-temp');
                });

              //! Storage Post image rollback

              requestRollback.tempImageList = async (): Promise<void> => {
                await request.server.storageService.setImageListMoveTo(tempImageList, postPath);
              };
            }

            /** Move Markdown image to temp (delete) */

            const postMarkdownListDestination: string = [postPath, 'markdown'].join('/');
            const postMarkdownList: string[] = await request.server.storageService
              .getImageList(postMarkdownListDestination)
              .catch(() => {
                throw new Error('fastify/storage/failed-read-file-list');
              });

            if (postMarkdownList.length) {
              const tempMarkdownList: string[] = await request.server.storageService
                .setImageListMoveTo(postMarkdownList, userTemp)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-post-image-to-temp');
                });

              //! Storage Markdown images rollback

              requestRollback.tempMarkdownList = async (): Promise<void> => {
                await request.server.storageService.setImageListMoveTo(tempMarkdownList, postPath);
              };
            }

            return post;
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
