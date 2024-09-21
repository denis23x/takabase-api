/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, User } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    schema: {
      tags: ['Users'],
      description: 'List all users, paginated',
      querystring: {
        type: 'object',
        properties: {
          username: {
            $ref: 'partsUsernameSchema#'
          },
          query: {
            $ref: 'partsPageQuerySchema#'
          },
          page: {
            $ref: 'partsPageSchema#'
          },
          size: {
            $ref: 'partsPageSizeSchema#'
          }
        },
        required: ['page', 'size']
      },
      response: {
        '200': {
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
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<QuerystringSearch>, reply: FastifyReply): Promise<any> {
      // Extract information from the request query
      const username: string = request.query.username;
      const size: number = request.query.size;
      const page: number = request.query.page;
      const query: string = request.query.query;

      // Define the arguments for find a users
      const userFindManyArgs: Prisma.UserFindManyArgs = {
        select: request.server.prismaPlugin.getUserSelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Profile */

      if (username) {
        userFindManyArgs.select = {
          ...userFindManyArgs.select,
          description: true
        };

        userFindManyArgs.where = {
          ...userFindManyArgs.where,
          name: username
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

      // Find the posts
      await request.server.prisma.user
        .findMany(userFindManyArgs)
        .then((userList: User[]) => {
          // Return the post
          return reply.status(200).send({
            data: userList,
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
