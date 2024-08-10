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

      const postPasswordFindUniqueArgs: Prisma.PostPasswordFindUniqueArgs = {
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
        postPasswordFindUniqueArgs.where.password = password;
        postPasswordFindUniqueArgs.select.password = false;
      } else {
        // If no password is provided, check if the request has a user
        if (request.user) {
          postPasswordFindUniqueArgs.where.userFirebaseUid = request.user.uid;
          postPasswordFindUniqueArgs.select.password = true;
        } else {
          // If there is no user and no password, return null
          return reply.status(200).send({
            data: null,
            statusCode: 200
          });
        }
      }

      /** Scope */

      if (scope) {
        postPasswordFindUniqueArgs.select = request.server.prismaPlugin.setScope(postPasswordFindUniqueArgs, scope);
      }

      await request.server.prisma.postPassword
        .findUnique(postPasswordFindUniqueArgs)
        .then((postPassword: PostPassword | null) => {
          if (!postPassword && password) {
            return reply.status(403).send({
              error: 'Forbidden',
              message: 'Access denied',
              statusCode: 403
            });
          } else {
            return reply.status(200).send({
              data: postPassword,
              statusCode: 200
            });
          }
        })
        .catch((error: Error) => {
          const responseError: ResponseError = reply.server.prismaPlugin.getErrorPrisma(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
