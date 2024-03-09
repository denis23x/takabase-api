/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post } from '../../database/client';
import { PostUpdateDto } from '../../types/dto/post/post-update';

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
          firebaseId: {
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
      const postUpdateInput: Prisma.PostUpdateInput = {
        ...request.body
      };

      const postUpdateArgs: Prisma.PostUpdateArgs = {
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
        where: {
          userId: Number(request.user.id),
          id: Number(request.params.id)
        },
        data: postUpdateInput
      };

      /** Update markdown images */

      const postMarkdown: string = String(postUpdateArgs.data.markdown);
      const postFirebaseId: string = String(postUpdateArgs.data.firebaseId);

      const markdownImageList: string[] = request.server.storageService.getMarkdownImageList(postMarkdown);
      const markdownImageListTemp: string[] = request.server.storageService.getMarkdownImageListTemp(markdownImageList);
      const markdownImageListPost: string[] = await request.server.storageService.getBucketImageListTempTransfer(
        postFirebaseId,
        markdownImageListTemp
      );

      postUpdateArgs.data.markdown = request.server.storageService.getMarkdownImageListRewrite(
        postMarkdown,
        markdownImageListTemp,
        markdownImageListPost
      );

      /** Remove markdown images (after update) */

      const userFirebaseId: string = String(request.user.firebaseId);
      const postMarkdownUpdated: string = String(postUpdateArgs.data.markdown);

      const markdownUpdated: string[] = request.server.storageService.getMarkdownImageList(postMarkdownUpdated);
      const markdownUpdatedPost: string[] = request.server.storageService.getMarkdownImageListPost(markdownUpdated);

      const markdownImageListDone: string[] = await request.server.storageService.getBucketImageListPostUpdate(
        userFirebaseId,
        postFirebaseId,
        markdownUpdatedPost
      );

      await request.server.prisma.post
        .update(postUpdateArgs)
        .then((post: Post) => {
          return reply.status(200).send({
            data: {
              ...post,
              markdownImageList: markdownImageListDone
            },
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
