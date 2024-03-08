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

      // Get a list of temporary images from the markdown
      const markdownImageListTemp: string[] = request.server.storageService.getMarkdownTempImageList(postMarkdown);

      // prettier-ignore
      // Get the temporary images from the bucket and save them as permanent images
      const markdownImageList: string[] = await request.server.storageService.getBucketTempTransfer(postFirebaseId, markdownImageListTemp);

      // prettier-ignore
      // Rewrite the markdown to replace the temporary images with the permanent images
      postUpdateArgs.data.markdown = request.server.storageService.getMarkdownTempImageListRewrite(postMarkdown, markdownImageListTemp, markdownImageList);

      return request.server.prisma.post
        .update(postUpdateArgs)
        .then((post: Post) => {
          return reply.status(200).send({
            data: {
              ...post,
              markdownImageList
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
