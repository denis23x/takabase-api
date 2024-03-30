/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post } from '../../database/client';
import { QuerystringScope } from '../../types/crud/querystring/querystring-scope';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    schema: {
      params: {
        $ref: 'paramsIdSchema#'
      },
      querystring: {
        allOf: [
          {
            type: 'object',
            properties: {
              categoryId: {
                type: 'number'
              },
              userId: {
                type: 'number'
              },
              userName: {
                type: 'string',
                pattern: '^\\S*$'
              }
            }
          },
          {
            $ref: 'querystringScopeSchema#'
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
    handler: async function (request: FastifyRequest<QuerystringScope>, reply: FastifyReply): Promise<any> {
      const { userId, userName, categoryId, scope }: Record<string, any> = request.query;

      const postFindUniqueOrThrowArgs: Prisma.PostFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getPostSelect(),
          markdown: true
        },
        where: {
          id: Number(request.params.id)
        }
      };

      /** Filter */

      if (userId) {
        postFindUniqueOrThrowArgs.where = {
          ...postFindUniqueOrThrowArgs.where,
          userId
        };
      }

      if (userName) {
        postFindUniqueOrThrowArgs.where = {
          ...postFindUniqueOrThrowArgs.where,
          user: {
            name: userName
          }
        };
      }

      if (categoryId) {
        postFindUniqueOrThrowArgs.where = {
          ...postFindUniqueOrThrowArgs.where,
          categoryId
        };
      }

      /** Scope */

      if (scope) {
        postFindUniqueOrThrowArgs.select = request.server.prismaPlugin.setScope(postFindUniqueOrThrowArgs, scope);
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
          const responseError: ResponseError = reply.server.prismaPlugin.getError(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
