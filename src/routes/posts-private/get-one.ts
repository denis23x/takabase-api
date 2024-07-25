/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PostPrivate } from '../../database/client';
import type { QuerystringScope } from '../../types/crud/querystring/querystring-scope';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Private'],
      description: 'Get a single private',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
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
        '200': {
          type: 'object',
          properties: {
            data: {
              $ref: 'postPrivateSchema#'
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
      const { scope }: Record<string, any> = request.query;

      const postPrivateFindUniqueOrThrowArgs: Prisma.PostPrivateFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getPostPrivateSelect(),
          firebaseUid: true,
          markdown: true
        },
        where: {
          id: Number(request.params.id),
          userFirebaseUid: request.user.uid
        }
      };

      /** Scope */

      if (scope) {
        // prettier-ignore
        postPrivateFindUniqueOrThrowArgs.select = request.server.prismaPlugin.setScope(postPrivateFindUniqueOrThrowArgs, scope);
      }

      await reply.server.prisma.postPrivate
        .findUniqueOrThrow(postPrivateFindUniqueOrThrowArgs)
        .then((postPrivate: PostPrivate) => {
          return reply.status(200).send({
            data: postPrivate,
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
