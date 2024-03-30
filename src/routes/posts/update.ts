/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post, PrismaClient } from '../../database/client';
import { PostUpdateDto } from '../../types/dto/post/post-update';
import { DocumentReference, DocumentSnapshot, DocumentData, WriteResult } from 'firebase-admin/firestore';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { parse } from 'path';

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

      const userId: number = request.user.id;
      const userFirebaseUid: string = request.user.firebaseUid;
      const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');

      const postId: number = request.params.id;
      const postFirebaseUid: string = String(request.body.firebaseUid || '');
      const postPath: string = ['users', userFirebaseUid, 'posts', postFirebaseUid].join('/');
      const postImage: string | null | undefined = request.body.image as any;
      const postMarkdown: string = String(request.body.markdown || '');

      //* Make post updating preparations before start transaction

      const postDocumentReference: DocumentReference = request.server.firestoreService.getDocumentReference(postPath);
      const postDocumentSnapshot: DocumentSnapshot = await postDocumentReference.get().catch(() => {
        throw new Error('fastify/firestore/failed-get-post');
      });

      //? Transaction

      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
            requestRollback = {};

            /** Move Post image to post (save) */

            if (postImage) {
              const tempImageList: string[] = request.server.markdownService.getImageListSubstringUrl([postImage]);
              const postImageListDestination: string = postDocumentReference.path;
              const postImageList: string[] = await request.server.storageService
                .setImageListMoveTo(tempImageList, postImageListDestination)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-temp-image-to-post');
                });

              //! Storage Post image rollback

              requestRollback.postImageList = async (): Promise<void> => {
                await request.server.storageService.setImageListMoveTo(postImageList, userTemp);
              };

              //* Set

              request.body.image = request.server.markdownService.getImageListRewrite(postImage, tempImageList, postImageList);
            } else {
              const postImageListDestination: string = [postPath].join('/');
              const postImageList: string[] = await request.server.storageService
                .getImageList(postImageListDestination)
                .catch(() => {
                  throw new Error('fastify/storage/failed-read-file-list');
                });

              const tempImageListUnusedDestination: string[] = postImageList.filter((postImageList: string) => !parse(postImageList).dir.endsWith('markdown'));
              const tempImageList: string[] = await request.server.storageService
                .setImageListMoveTo(tempImageListUnusedDestination, userTemp)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-post-image-to-temp');
                });

              //! Storage Post image rollback

              requestRollback.tempImageList = async (): Promise<void> => {
                await request.server.storageService.setImageListMoveTo(tempImageList, postPath);
              };
            }

            /** Move Markdown image to post (save) */

            const bodyMarkdownList: string[] = request.server.markdownService.getImageList(postMarkdown);
            const tempMarkdownList: string[] = request.server.markdownService.getImageListTemp(bodyMarkdownList);

            if (tempMarkdownList.length) {
              const postMarkdownListDestination: string = [postPath, 'markdown'].join('/');
              const postMarkdownList: string[] = await request.server.storageService
                .setImageListMoveTo(tempMarkdownList, postMarkdownListDestination)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-temp-image-to-post');
                });

              //! Storage Markdown images rollback

              requestRollback.postMarkdownList = async (): Promise<void> => {
                await request.server.storageService.setImageListMoveTo(postMarkdownList, userTemp);
              };

              //* Set

              request.body.markdown = request.server.markdownService.getImageListRewrite(postMarkdown, tempMarkdownList, postMarkdownList);
            }

            /** Move Markdown image to temp (delete) */

            const updatedPostMarkdown: string[] = request.server.markdownService.getImageList(String(request.body.markdown || ''));
            const updatedPostMarkdownList: string[] = request.server.markdownService.getImageListPost(updatedPostMarkdown);
            const updatedPostMarkdownListDestination: string = [postPath, 'markdown'].join('/');
            const updatedPostMarkdownListUnused: string[] = await request.server.storageService
              .getImageList(updatedPostMarkdownListDestination)
              .then((imageList: string[]) => imageList.filter((imageUrl: string) => !updatedPostMarkdownList.includes(encodeURIComponent(imageUrl))))
              .catch(() => {
                throw new Error('fastify/storage/failed-read-file-list');
              });

            if (updatedPostMarkdownListUnused.length) {
              const updatedTempMarkdownList: string[] = await request.server.storageService
                .setImageListMoveTo(updatedPostMarkdownListUnused, userTemp)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-post-image-to-temp');
                });

              //! Storage Markdown files rollback

              requestRollback.updatedTempMarkdownList = async (): Promise<void> => {
                await request.server.storageService.setImageListMoveTo(updatedTempMarkdownList, updatedPostMarkdownListDestination);
              };
            }

            /** Update related Firestore document */

            //! Firestore document rollback

            requestRollback.postDocument = async (): Promise<void> => {
              await postDocumentReference.set(postDocumentSnapshot.data() as DocumentData)
            };

            const postDocumentUpdateDto: any = {
              markdown: updatedPostMarkdownList.map((imageUrl: string) => decodeURIComponent(imageUrl))
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
                userId,
                id: postId
              },
              data: {
                ...request.body
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

          //! Rollback && Send error or pass further for retry

          const responseError: ResponseError | null = await reply.server.prismaService.setErrorTransaction(error, requestRetries >= MAX_RETRIES, requestRollback);

          if (responseError) {
            return reply.status(responseError.statusCode).send(responseError);
          }
        }
      }
    }
  });
}
