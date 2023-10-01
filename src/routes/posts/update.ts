/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Post } from '../../database/client';
import { PUTPost } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: '/:id',
    schema: {
      tags: ['Posts'],
      description: 'Updates a Post',
      security: [
        {
          Authorization_Token: ['Authorization']
        }
      ],
      params: {
        $ref: 'requestParameterIdSchema#'
      },
      headers: {
        type: 'object',
        properties: {
          userId: {
            type: 'number'
          }
        }
      },
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
            type: 'string'
          },
          categoryId: {
            type: 'number'
          }
        }
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
    handler: async function (request: FastifyRequest<PUTPost>, reply: FastifyReply): Promise<any> {
      const { id }: Record<string, number> = request.params;

      const { userid }: Record<string, any> = request.headers;

      const postUpdateInput: Prisma.PostUpdateInput = request.body;

      const postUpdateArgs: Prisma.PostUpdateArgs = {
        select: {
          ...request.server.prismaService.getPostSelect(),
          category: {
            select: request.server.prismaService.getCategorySelect()
          },
          user: {
            select: request.server.prismaService.getUserSelect()
          }
        },
        where: {
          userId: userid,
          id
        },
        data: {
          ...postUpdateInput
        }
      };

      return request.server.prisma.post
        .update(postUpdateArgs)
        .then((post: Post) => {
          return reply.status(200).send({
            data: post,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.getResponseError(reply, error);
        });
    }
  });
}
