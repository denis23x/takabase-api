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

      const userId: number = request.user.id;
      const userFirebaseUid: string = request.user.firebaseUid;
      const userTemp: string = ['users', userFirebaseUid, 'temp'].join('/');

      const postPath: string = ['users', userFirebaseUid, 'posts'].join('/');
      const postImage: string | null | undefined = request.body.image;
      const postCategoryId: number = request.body.categoryId;
      const postMarkdown: string = request.body.markdown;

      // Delete for more adjustable Prisma Data

      delete request.body.categoryId;

      //? Transaction

      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Post> => {
            requestRollback = {};

            /** Add empty Firestore document */

            const postDocumentReference: DocumentReference = await request.server.firestorePlugin
              .addDocument(postPath, {})
              .catch(() => {
                throw new Error('fastify/firestore/failed-add-post');
              });

            //! Firestore document rollback

            requestRollback.postDocument = async (): Promise<void> => {
              await postDocumentReference.delete();
            };

            /** Move Post image to post (save) */

            if (postImage) {
              const tempImageList: string[] = request.server.markdownPlugin.getImageListSubstringUrl([postImage]);
              const postImageListDestination: string = postDocumentReference.path;
              const postImageList: string[] = await request.server.storagePlugin
                .setImageListMoveTo(tempImageList, postImageListDestination)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-temp-image-to-post');
                });

              //! Storage Post image rollback

              requestRollback.postImageList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMoveTo(postImageList, userTemp);
              };

              //* Set

              request.body.image = request.server.markdownPlugin.getImageListRewrite(postImage, tempImageList, postImageList);
            }

            /** Move Markdown image to post (save) */

            const bodyMarkdownList: string[] = request.server.markdownPlugin.getImageList(postMarkdown);
            const tempMarkdownList: string[] = request.server.markdownPlugin.getImageListTemp(bodyMarkdownList);

            if (tempMarkdownList.length) {
              const postMarkdownListDestination: string = [postDocumentReference.path, 'markdown'].join('/');
              const postMarkdownList: string[] = await request.server.storagePlugin
                .setImageListMoveTo(tempMarkdownList, postMarkdownListDestination)
                .catch(() => {
                  throw new Error('fastify/storage/failed-move-temp-image-to-post');
                });

              //! Storage Markdown images rollback

              requestRollback.postMarkdownList = async (): Promise<void> => {
                await request.server.storagePlugin.setImageListMoveTo(postMarkdownList, userTemp);
              };

              //* Set

              request.body.markdown = request.server.markdownPlugin.getImageListRewrite(postMarkdown, tempMarkdownList, postMarkdownList);

              /** Update empty Firestore document */

              const postDocumentUpdateDto: any = {
                markdown: postMarkdownList.map((imageUrl: string) => decodeURIComponent(imageUrl))
              };

              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const postDocumentUpdate: WriteResult = await postDocumentReference
                .update(postDocumentUpdateDto)
                .catch(() => {
                  throw new Error('fastify/firestore/failed-update-post');
                });
            }

            /** Create MySQL row */

            const postCreateArgs: Prisma.PostCreateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostSelect(),
                category: {
                  select: {
                    ...request.server.prismaPlugin.getCategorySelect()
                  }
                },
                user: {
                  select: {
                    ...request.server.prismaPlugin.getUserSelect()
                  }
                }
              },
              data: {
                ...request.body,
                firebaseUid: postDocumentReference.id,
                user: {
                  connect: {
                    id: userId
                  }
                },
                category: {
                  connect: {
                    id: postCategoryId
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

          //! Rollback && Send error or pass further for retry

          const responseError: ResponseError | null = await reply.server.prismaPlugin.setErrorTransaction(error, requestRetries >= MAX_RETRIES, requestRollback);

          if (responseError) {
            return reply.status(responseError.statusCode).send(responseError);
          }
        }
      }
    }
  });
}
