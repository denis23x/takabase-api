/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PostCreateDto } from '../../types/dto/post/post-create';
import { DocumentReference } from 'firebase-admin/firestore';
import { Post, Prisma, PrismaClient } from '../../database/client';
import { WriteResult } from 'firebase-admin/lib/firestore';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Posts'],
      description: 'Creates a new Post',
      security: [
        {
          Authorization: []
        }
      ],
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
        required: ['name', 'description', 'markdown', 'categoryId'],
        additionalProperties: false
      },
      response: {
        201: {
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
    handler: async function (request: FastifyRequest<PostCreateDto>, reply: FastifyReply): Promise<void> {
      const MAX_RETRIES: number = 3;

      //* Common info

      const userFirebaseUid: string = request.user.firebaseUid;
      const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');
      const postPath: string = ['users', userFirebaseUid, 'posts'].join('/');

      //? Transaction

      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
            requestRollback = {};

            /** Add empty Firestore document */

            const postDocumentReference: DocumentReference = await request.server.firestoreService
              .addDocument(postPath, {})
              .catch(() => {
                throw new Error('fastify/firestore/failed-add-post');
              });

            const postMarkdown: string = request.body.markdown;
            const postFirebaseUid: string = postDocumentReference.id;

            //! Firestore document rollback

            requestRollback.postDocument = async (): Promise<void> => {
              await postDocumentReference.delete();
            };

            /** Move image temp to post */

            const bodyMarkdownImageList: string[] = request.server.markdownService.getImageList(postMarkdown);
            const tempMarkdownImageList: string[] = request.server.markdownService.getImageListTemp(bodyMarkdownImageList);
            const postMarkdownImageList: string[] = await request.server.storageService
              .setImageListMoveTo(tempMarkdownImageList, postDocumentReference.path)
              .catch(() => {
                throw new Error('fastify/storage/failed-move-temp-image-to-post');
              });

            //! Storage files rollback

            requestRollback.postStorage = async (): Promise<void> => {
              await request.server.storageService.setImageListMoveTo(postMarkdownImageList, userTemp);
            };

            /** Update empty Firestore document */

            const postDocumentUpdateDto: any = {
              markdownImageList: postMarkdownImageList.map((imageUrl: string) => decodeURIComponent(imageUrl))
            };

            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const postDocumentUpdate: WriteResult = await postDocumentReference
              .update(postDocumentUpdateDto)
              .catch(() => {
                throw new Error('fastify/firestore/failed-update-post');
              });

            /** Create MySQL row */

            const postCreateMarkdown: string = request.server.markdownService.getImageListRewrite(postMarkdown, tempMarkdownImageList, postMarkdownImageList);
            const postCreateArgs: Prisma.PostCreateArgs = {
              select: {
                ...request.server.prismaService.getPostSelect(),
                category: {
                  select: request.server.prismaService.getCategorySelect()
                },
                user: {
                  select: request.server.prismaService.getUserSelect()
                }
              },
              data: {
                name: request.body.name,
                image: request.body.image,
                description: request.body.description,
                firebaseUid: postFirebaseUid,
                markdown: postCreateMarkdown,
                user: {
                  connect: {
                    id: Number(request.user.id)
                  }
                },
                category: {
                  connect: {
                    id: Number(request.body.categoryId)
                  }
                }
              }
            };

            return prismaClient.post.create(postCreateArgs);
          }).then((post: Post) => {
            return reply.status(201).send({
              data: post,
              statusCode: 201
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
