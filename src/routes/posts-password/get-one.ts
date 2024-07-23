/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, PostPassword } from '../../database/client';
import { QuerystringScope } from '../../types/crud/querystring/querystring-scope';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Password'],
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
              $ref: 'postPasswordSchema#'
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

      const postPasswordFindUniqueOrThrowArgs: Prisma.PostPasswordFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getPostPasswordSelect(),
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
        postPasswordFindUniqueOrThrowArgs.select = request.server.prismaPlugin.setScope(postPasswordFindUniqueOrThrowArgs, scope);
      }

      await reply.server.prisma.postPassword
        .findUniqueOrThrow(postPasswordFindUniqueOrThrowArgs)
        .then((postPassword: PostPassword) => {
          return reply.status(200).send({
            data: postPassword,
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
