/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PostBookmarkGetDto } from '../../types/dto/post-bookmark/post-bookmark-get';
import type { PostBookmark, Prisma } from '../../database/client';

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
          attachPost: {
            $ref: 'partsPostBookmarkAttachSchema#'
          }
        }
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: 'postBookmarkSchema#'
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
    handler: async function (request: FastifyRequest<PostBookmarkGetDto>, reply: FastifyReply): Promise<any> {
      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Define the arguments for finding many post bookmarks based on userFirebaseUid
      const postBookmarkFindManyArgs: Prisma.PostBookmarkFindManyArgs = {
        orderBy: {
          id: 'desc'
        },
        where: {
          userFirebaseUid
        }
      };

      // prettier-ignore
      const postBookmarkList: PostBookmark[] = await reply.server.prisma.postBookmark.findMany(postBookmarkFindManyArgs);

      // Check if postBookmarkList exists and attachPost query parameter is present
      if (postBookmarkList.length) {
        if (request.query.attachPost) {
          // Create a queryParams object
          const query: Record<string, any> = request.query;
          const queryParams: URLSearchParams = new URLSearchParams(query);

          // Append the postId from the list of post bookmarks
          postBookmarkList.forEach((postBookmark: PostBookmark) => {
            queryParams.append('postIdList', String(postBookmark.postId));
          });

          // Redirect the request to the specified post URL with a 307 status code
          return reply.status(307).redirect('/api/v1/posts?' + queryParams.toString());
        }
      }

      // If postBookmarkList not found or attachPost is not present, return a 200 status code with the postBookmarkList data
      return reply.status(200).send({
        data: postBookmarkList,
        statusCode: 200
      });
    }
  });
}
