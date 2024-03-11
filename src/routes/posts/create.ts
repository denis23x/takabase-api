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
    // prettier-ignore
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

      const postMarkdown: string = String(postCreateArgs.data.markdown);
      const postFirebaseUid: string = String(postCreateArgs.data.firebaseUid);

      const markdownImageList: string[] = request.server.storage.getMarkdownImageList(postMarkdown);
      const markdownImageListTemp: string[] = request.server.storage.getMarkdownImageListTemp(markdownImageList);
      const markdownImageListPost: string[] = await request.server.storage.getBucketImageListTempTransfer(postFirebaseUid, markdownImageListTemp);

      /** Update markdown images */

      postCreateArgs.data.markdown = request.server.storage.getMarkdownImageListRewrite(postMarkdown, markdownImageListTemp, markdownImageListPost);

      await request.server.prisma.post
        .create(postCreateArgs)
        .then((post: Post) => {
          return reply.status(201).send({
            data: {
              ...post,
              markdownImageList: markdownImageListPost
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
