/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post } from '../../database/client';
import { PostCreateDto } from '../../types/dto/post/post-create';

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
    handler: async function (request: FastifyRequest<PostCreateDto>, reply: FastifyReply): Promise<any> {
      const { categoryId, ...requestBody } = request.body;

      const postCreateInput: Prisma.PostCreateInput = {
        ...requestBody,
        user: {
          connect: {
            id: Number(request.user.id)
          }
        },
        category: {
          connect: {
            id: Number(categoryId)
          }
        }
      };

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
        data: postCreateInput
      };

      /** Update markdown images */

      const postMarkdown: string = String(postCreateArgs.data.markdown);
      const postFirebaseId: string = String(postCreateArgs.data.firebaseId);

      // Get a list of temporary images from the markdown
      const markdownImageListTemp: string[] = request.server.storageService.getMarkdownTempImageList(postMarkdown);

      // prettier-ignore
      // Get the temporary images from the bucket and save them as permanent images
      const markdownImageList: string[] = await request.server.storageService.getBucketTempImageListTransfer(postFirebaseId, markdownImageListTemp);

      // prettier-ignore
      // Rewrite the markdown to replace the temporary images with the permanent images
      postCreateArgs.data.markdown = request.server.storageService.getMarkdownTempImageListRewrite(postMarkdown, markdownImageListTemp, markdownImageList);

      await reply.server.prisma.post
        .create(postCreateArgs)
        .then((post: Post) => {
          return reply.status(201).send({
            data: {
              ...post,
              markdownImageList
            },
            statusCode: 201
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
