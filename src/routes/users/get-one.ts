/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';
import { QuerystringScope } from '../../types/crud/querystring/querystring-scope';

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
            $ref: 'querystringScopeSchema#'
          }
        ]
      },
      tags: ['Users'],
      description: 'Get a single user',
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              $ref: 'userSchema#'
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
    handler: async function (request: FastifyRequest<QuerystringScope>, reply: FastifyReply): Promise<void> {
      const { scope }: Record<string, any> = request.query;

      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: request.server.prismaService.getUserSelect(),
        where: {
          id: Number(request.user.id)
        }
      };

      /** Scope */

      if (scope) {
        userFindUniqueOrThrowArgs.select = request.server.prismaService.setScope(userFindUniqueOrThrowArgs, scope);
      }

      await reply.server.prisma.user
        .findUniqueOrThrow(userFindUniqueOrThrowArgs)
        .then((user: User) => {
          return reply.status(200).send({
            data: user,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
