/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    schema: {
      tags: ['Users'],
      description: 'List all users, paginated',
      querystring: {
        allOf: [
          {
            $ref: 'querystringSearchSchema#'
          },
          {
            $ref: 'partsSearchScopeSchema#'
          }
        ]
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: 'userSchema#'
              }
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<QuerystringSearch>, reply: FastifyReply): Promise<any> {
      const { name, query, orderBy, scope, size, page }: Record<string, any> = request.query;

      const userFindManyArgs: Prisma.UserFindManyArgs = {
        select: request.server.prismaPlugin.getUserSelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Profile */

      if (name) {
        userFindManyArgs.select = {
          ...userFindManyArgs.select,
          description: true
        };

        userFindManyArgs.where = {
          ...userFindManyArgs.where,
          name
        };
      }

      /** Search */

      if (query) {
        userFindManyArgs.where = {
          ...userFindManyArgs.where,
          name: {
            contains: query
          }
        };
      }

      /** Order */

      if (orderBy) {
        userFindManyArgs.orderBy = request.server.prismaPlugin.setOrderBy(userFindManyArgs, orderBy);
      }

      /** Scope */

      if (scope) {
        userFindManyArgs.select = request.server.prismaPlugin.setScope(userFindManyArgs, scope);
      }

      await reply.server.prisma.user
        .findMany(userFindManyArgs)
        .then((userList: User[]) => {
          return reply.status(200).send({
            data: userList,
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
