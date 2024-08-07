/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { QuerystringSearch } from '../../types/crud/querystring/querystring-search';
import type { Post, PostBookmark, Prisma } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Bookmark'],
      description: 'List all privates, paginated',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      querystring: {
        type: 'object',
        properties: {
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
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<QuerystringSearch>, reply: FastifyReply): Promise<any> {
      const { query, size, page }: Record<string, any> = request.query;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Define the arguments for finding many post bookmarks based on userFirebaseUid
      const postBookmarkFindManyArgs: Prisma.PostBookmarkFindManyArgs = {
        select: {
          postFirebaseUid: true
        },
        orderBy: {
          id: 'desc'
        },
        where: {
          userFirebaseUid
        }
      };

      // prettier-ignore
      const postBookmarkList: PostBookmark[] = await reply.server.prisma.postBookmark.findMany(postBookmarkFindManyArgs);

      // Extract the postFirebaseUid from the list of post bookmarks
      const postBookmarkFirebaseUidList: string[] = postBookmarkList.map((postBookmark: PostBookmark) => {
        return postBookmark.postFirebaseUid;
      });

      // Define the arguments for finding many posts based on the list of postFirebaseUids
      const postFindManyArgs: Prisma.PostFindManyArgs = {
        select: request.server.prismaPlugin.getPostSelect(),
        skip: (page - 1) * size,
        take: size,
        where: {
          firebaseUid: {
            in: postBookmarkFirebaseUidList
          }
        }
      };

      /** Search */

      if (query) {
        postFindManyArgs.where = {
          ...postFindManyArgs.where,
          name: {
            contains: query
          }
        };
      }

      // Execute the query to find many posts based on the specified arguments
      await reply.server.prisma.post
        .findMany(postFindManyArgs)
        .then((postList: Post[]) => {
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
