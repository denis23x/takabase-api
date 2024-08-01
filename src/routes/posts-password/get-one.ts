/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PostPassword } from '../../database/client';
import type { QuerystringScope } from '../../types/crud/querystring/querystring-scope';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    onRequest: fastify.verifyIdTokenOptional,
    schema: {
      tags: ['Posts-Password'],
      description: 'Get a single private',
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
          password: {
            $ref: 'partsPasswordSchema#'
          },
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
      const { password, scope }: Record<string, any> = request.query;

      const postPasswordFindUniqueOrThrowArgs: Prisma.PostPasswordFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getPostPasswordSelect(),
          firebaseUid: true,
          markdown: true
        },
        where: {
          id: Number(request.params.id)
        }
      };

      // Check if a password is provided
      if (password) {
        postPasswordFindUniqueOrThrowArgs.where.password = password;
        postPasswordFindUniqueOrThrowArgs.select.password = false;
      } else {
        // If no password is provided, check if the request has a user
        if (request.user) {
          postPasswordFindUniqueOrThrowArgs.where.userFirebaseUid = request.user.uid;
          postPasswordFindUniqueOrThrowArgs.select.password = true;
        } else {
          // If there is no user and no password, return a 403 Forbidden error
          return reply.status(403).send({
            message: 'Request failed due to insufficient permissions',
            error: 'Forbidden',
            statusCode: 403
          });
        }
      }

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
