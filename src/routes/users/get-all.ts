/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    schema: {
      querystring: {
        allOf: [
          {
            $ref: 'querystringSearchSchema#'
          },
          {
            $ref: 'querystringScopeSchema#'
          }
        ]
      },
      tags: ['Users'],
      description: 'List all users, paginated',
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
        select: request.server.prismaService.getUserSelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Search */

      if (name) {
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
            search: query + '*'
          }
        };

        /** Default relevant order */

        userFindManyArgs.orderBy = {
          // ...userFindManyArgs.orderBy,
          _relevance: {
            fields: ['name'],
            sort: 'asc',
            search: query
          }
        };
      }

      /** Order */

      if (orderBy) {
        userFindManyArgs.orderBy = request.server.prismaService.setOrderBy(userFindManyArgs, orderBy);
      }

      /** Scope */

      if (scope) {
        userFindManyArgs.select = request.server.prismaService.setScope(userFindManyArgs, scope);
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
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
