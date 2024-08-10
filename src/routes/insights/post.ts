/** @format */

import type { Prisma } from '../../database/client';
import type { Dayjs } from 'dayjs';
import type { Post } from '../../database/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'post',
    // onRequest: [fastify.verifyIdToken, fastify.verifyAdmin],
    schema: {
      tags: ['Insights'],
      description: 'Seed database with Post insights',
      // security: [
      //   {
      //     swaggerBearerAuth: []
      //   }
      // ],
      response: {
        '201': {
          type: 'object',
          properties: {
            data: {
              $ref: 'partsInsightResponseSchema#'
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
    handler: async function (request: FastifyRequest<any>, reply: FastifyReply): Promise<void> {
      const postFindManyArgs: Prisma.PostFindManyArgs = {
        select: {
          createdAt: true
        }
      };

      const postList: Partial<Post>[] = await request.server.prisma.post.findMany(postFindManyArgs);
      const postListCreatedAt: Dayjs[] = postList.map((post: Partial<Post>) => {
        return request.server.dayjs(post.createdAt).utc();
      });

      const postListMinimum: Dayjs = request.server.dayjsPlugin.getMin(postListCreatedAt);
      const postListStart: Dayjs = request.server.dayjs(postListMinimum).utc().endOf('day');
      const postListEnd: Dayjs = request.server.dayjs().utc().endOf('day');
      const postListRange: Dayjs[] = request.server.dayjsPlugin.getRange(postListStart, postListEnd, 'day');
      const postListPromise: Promise<number>[] = postListRange.map((date: Dayjs) => {
        return request.server.prisma.post.count({
          where: {
            createdAt: {
              lte: request.server.dayjsPlugin.getEndOf(date)
            }
          }
        });
      });

      const postListCount: number[] = await Promise.all(postListPromise);
      const postListInsight: any[] = postListRange.map((date: Dayjs, i: number) => {
        return {
          date: request.server.dayjsPlugin.getEndOf(date),
          count: postListCount[i]
        };
      });

      return reply.status(200).send({
        data: postListInsight,
        statusCode: 200
      });
    }
  });
}
