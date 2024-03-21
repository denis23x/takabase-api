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
      const rollback: any = {};

      // prettier-ignore
      await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
        /** Add empty Firestore document */

        const userFirebaseUid: string = request.user.firebaseUid;
        const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');
        const postPath: string = ['users', userFirebaseUid, 'posts'].join('/');
        const postDocumentReference: DocumentReference = await request.server.firestoreService
          .addDocument(postPath, {})
          .catch(() => {
            throw new Error('fastify/firestore/failed-add-post');
          });

        const postMarkdown: string = request.body.markdown;
        const postFirebaseUid: string = postDocumentReference.id;

        //! Firestore document rollback

        rollback.postDocument = async (): Promise<void> => {
          await postDocumentReference.delete();
        };

        /** Move image temp to post */

        const markdownImageListBody: string[] = request.server.markdownService.getImageList(postMarkdown);
        const markdownImageListTemp: string[] = request.server.markdownService.getImageListTemp(markdownImageListBody);
        const markdownImageListPost: string[] = await request.server.storageService
          .setImageListMoveTo(markdownImageListTemp, postDocumentReference.path)
          .catch(() => {
            throw new Error('fastify/storage/failed-move-temp-image-to-post');
          });

        //! Storage files rollback

        rollback.postStorage = async (): Promise<void> => {
          await request.server.storageService.setImageListMoveTo(markdownImageListPost, userTemp);
        };

        /** Update empty Firestore document */

        const markdownImageList: string[] = markdownImageListPost.map((imageUrl: string) => decodeURIComponent(imageUrl));

        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const postDocumentUpdate: WriteResult = await postDocumentReference
          .update({ markdownImageList })
          .catch(() => {
            throw new Error('fastify/firestore/failed-update-post');
          });

        /** Create MySQL row */

        const postCreateMarkdown: string = request.server.markdownService.getImageListRewrite(postMarkdown, markdownImageListTemp, markdownImageListPost);
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

        const post: Post = await prismaClient.post
          .create(postCreateArgs)
          .catch(() => {
            throw new Error('fastify/prisma/failed-create-post');
          });

        /** Response to client */

        return post;
      }).then((post: Post) => {
        //* Success

        return reply.status(201).send({
          data: post,
          statusCode: 201
        });
      }).catch(async (error: any) => {
        await Promise.allSettled(Object.values(rollback)
          .map(async (callback: any) => callback()))
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
