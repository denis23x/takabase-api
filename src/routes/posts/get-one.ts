/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Post } from '../../database/client';
import { QuerystringScope } from '../../types/crud/querystring/querystring-scope';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    schema: {
      tags: ['Posts'],
      description: 'Get a single post',
      params: {
        type: 'object',
        properties: {
          id: {
            $ref: 'partsIdSchema#'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          scope: {
            $ref: 'partsScopeSchema#'
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
        404: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<ParamsId & QuerystringScope>, reply: FastifyReply): Promise<any> {
      const { scope }: Record<string, any> = request.query;

      const postFindUniqueOrThrowArgs: Prisma.PostFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getPostSelect(),
          firebaseUid: true,
          markdown: true
        },
        where: {
          id: Number(request.params.id)
        }
      };

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
