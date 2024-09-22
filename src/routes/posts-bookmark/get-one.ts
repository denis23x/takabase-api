/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ParamsId } from '../../types/crud/params/params-id';
import type { PostBookmarkGetDto } from '../../types/dto/post-bookmark/post-bookmark-get';
import type { Prisma, PostBookmark } from '../../database/client';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Bookmark'],
      description: 'Get a single bookmark',
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
              $ref: 'postBookmarkSchema#'
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
    // prettier-ignore
    handler: async function (request: FastifyRequest<ParamsId & PostBookmarkGetDto>, reply: FastifyReply): Promise<any> {
      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postId: number = Number(request.params.id);

      // Define the arguments for finding unique post bookmark based on postId and userFirebaseUid
      const postBookmarkFindUniqueArgs: Prisma.PostBookmarkFindUniqueArgs = {
        where: {
          postId_userFirebaseUid: {
            postId,
            userFirebaseUid
          }
        }
      };

      // Execute the query to find many post bookmark based on the specified arguments
      const postBookmark: PostBookmark | null = await request.server.prisma.postBookmark.findUnique(postBookmarkFindUniqueArgs);

      // Check if postBookmark exists and attachPost query parameter is present
      if (postBookmark) {
        if (request.query.attachPost) {
          // Redirect the request to the specified post URL with a 307 status code
          return reply.status(307).redirect('/api/v1/posts/' + postBookmark.postId);
        }
      }

      // If postBookmark not found or attachPost is not present, return a 200 status code with the postBookmark data
      return reply.status(200).send({
        data: postBookmark,
        statusCode: 200
      });
    }
  });
}
