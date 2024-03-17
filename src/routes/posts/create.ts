/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PostCreateDto } from '../../types/dto/post/post-create';
import { DocumentReference } from 'firebase-admin/firestore';
import { Post, Prisma, PrismaClient } from '../../database/client';
import { WriteResult } from 'firebase-admin/lib/firestore';

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
      const transactionOptions: any = request.server.prisma.getTransactionOptions();
      const transactionRollback: any = {};

      // prettier-ignore
      await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
        /** Add empty Firestore document */

        const userFirebaseUid: string = request.user.firebaseUid;
        const postCollectionPath: string = ['/users', userFirebaseUid, 'posts'].join('/');
        const postDocumentReference: DocumentReference = await request.server.firestoreService
          .addDocument(postCollectionPath, {})
          .catch(() => {
            throw new Error('fastify/firestore/failed-add-post', {
              cause: {
                code: 'fastify/firestore/failed-add-post',
                error: 'Internal Server Error',
                statusCode: 500
              }
            });
          });

        const postMarkdown: string = request.body.markdown;
        const postFirebaseUid: string = postDocumentReference.id;

        //! Rollback cooking

        transactionRollback.userFirebaseUid = userFirebaseUid;
        transactionRollback.postFirebaseUid = postFirebaseUid;
        transactionRollback.postDocumentReference = postDocumentReference;

        /** Move image temp to post */

        const markdownImageListBody: string[] = request.server.markdownService.getImageList(postMarkdown);
        const markdownImageListTemp: string[] = request.server.markdownService.getImageListTemp(markdownImageListBody);
        const markdownImageListPost: string[] = await request.server.storageService
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

        /** Update empty Firestore document */

        const markdownImageList: string[] = markdownImageListPost.map((imageUrl: string) => decodeURIComponent(imageUrl));

        //! Rollback cooking

        transactionRollback.markdownImageList = markdownImageList;

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

        /** Create MySQL row */

        const postCreateMarkdown: string = request.server.markdownService.getImageListRewrite(postMarkdown, markdownImageListTemp, markdownImageListPost);
        const postCreateArgs: Prisma.PostCreateArgs = {
          select: {
            ...request.server.prismaService.getPostSelect(),
            markdown: true,
            category: {
              select: request.server.prismaService.getCategorySelect()
            },
            user: {
              select: request.server.prismaService.getUserSelect()
            }
          },
          data: {
            ...request.body,
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

        const post: Post = await prismaClient.post
          .create(postCreateArgs)
          .catch(() => {
            throw new Error('fastify/prisma/failed-create-post', {
              cause: {
                code: 'fastify/prisma/failed-create-post',
                error: 'Internal Server Error',
                statusCode: 500
              }
            });
          });

        /** Response to client */

        return post;
      }, transactionOptions).then((post: Post) => {
        //* Success

        return reply.status(201).send({
          data: post,
          statusCode: 201
        });
      }).catch(async (error: any) => {
        const setRollback = (): Promise<unknown> => {
          switch (error.cause.code) {
            case 'fastify/storage/failed-move-temp-image-to-post':
            case 'fastify/firestore/failed-update-post':
            case 'fastify/prisma/failed-create-post': {
              return Promise.all([
                transactionRollback.postDocumentReference.delete(),
                reply.server.storageService.setImageListMovePostToTemp(transactionRollback.postFirebaseUid, transactionRollback.markdownImageList)
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
