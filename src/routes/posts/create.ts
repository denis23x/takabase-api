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
          category: {
            select: request.server.prismaService.getCategorySelect()
          },
          user: {
            select: request.server.prismaService.getUserSelect()
          }
        },
        data: postCreateInput
      };

      await reply.server.prisma.post
        .create(postCreateArgs)
        .then((post: Post) => {
          return reply.status(201).send({
            data: post,
            statusCode: 201
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
