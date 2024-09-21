/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Post } from '../../database/client';
import type { QuerystringScope } from '../../types/crud/querystring/querystring-scope';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { ParamsId } from '../../types/crud/params/params-id';

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
      response: {
        '200': {
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
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<ParamsId & QuerystringScope>, reply: FastifyReply): Promise<any> {
      // Extract post information from the request object
      const postId: number = Number(request.params.id);

      // Extract information from the request query
      const userFirebaseUid: string = request.query.userFirebaseUid;

      // Define the arguments for find a post
      const postFindUniqueOrThrowArgs: Prisma.PostFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getPostSelect(),
          markdown: true,
          user: {
            select: request.server.prismaPlugin.getUserSelect()
          },
          category: {
            select: request.server.prismaPlugin.getCategorySelect()
          }
        },
        where: {
          id: postId,
          userFirebaseUid
        }
      };

      // Find the post
      await request.server.prisma.post
        .findUniqueOrThrow(postFindUniqueOrThrowArgs)
        .then((post: Post) => {
          // Return the post
          return reply.status(200).send({
            data: post,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          const responseError: ResponseError = reply.server.prismaPlugin.getErrorPrisma(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
