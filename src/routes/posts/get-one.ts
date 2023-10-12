/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post } from '../../database/client';
import { GetOneRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    schema: {
      params: {
        $ref: 'requestParameterIdSchema#'
      },
      querystring: {
        allOf: [
          {
            $ref: 'requestQueryParameterScopeSchema#'
          }
        ]
      },
      tags: ['Posts'],
      description: 'Get a single post',
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
        404: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<GetOneRequest>, reply: FastifyReply): Promise<any> {
      const { scope }: Record<string, any> = request.query;

      const postFindUniqueOrThrowArgs: Prisma.PostFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaService.getPostSelect(),
          markdown: true
        },
        where: {
          id: Number(request.params.id)
        }
      };

      /** Scope */

      if (scope) {
        postFindUniqueOrThrowArgs.select = request.server.prismaService.setScope(postFindUniqueOrThrowArgs, scope);
      }

      await reply.server.prisma.post
        .findUniqueOrThrow(postFindUniqueOrThrowArgs)
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
