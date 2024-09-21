/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Post } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    schema: {
      tags: ['Posts'],
      description: 'List all posts, paginated',
      querystring: {
        type: 'object',
        properties: {
          username: {
            $ref: 'partsUsernameSchema#'
          },
          categoryId: {
            $ref: 'partsIdSchema#'
          },
          postIdList: {
            type: 'array',
            items: {
              type: 'number'
            }
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
                $ref: 'postSchema#'
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
      const categoryId: number = request.query.categoryId;
      const postIdList: number[] = request.query.postIdList;
      const size: number = request.query.size;
      const page: number = request.query.page;
      const query: string = request.query.query;

      // Define the arguments for find a posts
      const postFindManyArgs: Prisma.PostFindManyArgs = {
        select: request.server.prismaPlugin.getPostSelect(),
        orderBy: {
          id: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      };

      /** Filter */

      if (username) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          user: {
            name: username
          }
        };
      }

      if (categoryId) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          categoryId
        };
      }

      /** Bookmarks */

      if (postIdList?.length) {
        postFindManyArgs.orderBy = undefined;
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          id: {
            in: postIdList
          }
        };
      }

      /** Search */

      if (query) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          name: {
            contains: query
          }
        };
      }

      // Find the posts
      await request.server.prisma.post
        .findMany(postFindManyArgs)
        .then((postList: Post[]) => {
          // Return the post
          return reply.status(200).send({
            data: postList,
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
