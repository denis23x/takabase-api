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
    // prettier-ignore
    handler: async function (request: FastifyRequest<PostUpdateDto>, reply: FastifyReply): Promise<any> {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { categoryId, ...requestBody } = request.body;

      const postUpdateInput: Prisma.PostUpdateInput = {
        ...requestBody
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

      const postMarkdown: string = String(postUpdateArgs.data.markdown);
      const postFirebaseUid: string = String(postUpdateArgs.data.firebaseUid);

      const markdownImageList: string[] = request.server.storage.getMarkdownImageList(postMarkdown);
      const markdownImageListTemp: string[] = request.server.storage.getMarkdownImageListTemp(markdownImageList);
      const markdownImageListPost: string[] = await request.server.storage.getBucketImageListTempTransfer(postFirebaseUid, markdownImageListTemp);

      /** Update markdown images */

      postUpdateArgs.data.markdown = request.server.storage.getMarkdownImageListRewrite(postMarkdown, markdownImageListTemp, markdownImageListPost);

      /** Delete not used markdown images */

      const userFirebaseUid: string = String(request.user.firebaseUid);
      const postMarkdownUpdated: string = String(postUpdateArgs.data.markdown);

      const markdownImageListUpdated: string[] = request.server.storage.getMarkdownImageList(postMarkdownUpdated);
      const markdownImageListUpdatedPost: string[] = request.server.storage.getMarkdownImageListPost(markdownImageListUpdated);
      const markdownImageListUpdatedDone: string[] = await request.server.storage.getBucketImageListPostUpdate(userFirebaseUid, postFirebaseUid, markdownImageListUpdatedPost);

      await request.server.prisma.post
        .update(postUpdateArgs)
        .then((post: Post) => {
          return reply.status(200).send({
            data: {
              ...post,
              markdownImageList: markdownImageListUpdatedDone
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
