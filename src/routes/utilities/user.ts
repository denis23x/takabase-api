/** @format */

import { Prisma } from '../../database/client';
import type { Dayjs } from 'dayjs';
import type { User } from '../../database/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'user',
    // onRequest: [fastify.verifyIdToken, fastify.verifyAdmin],
    schema: {
      tags: ['Utilities'],
      description: 'Seed database with User insights',
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
      const userFindManyArgs: Prisma.UserFindManyArgs = {
        select: {
          createdAt: true
        }
      };

      const userList: Partial<User>[] = await request.server.prisma.user.findMany(userFindManyArgs);
      const userListCreatedAt: Date[] = userList.map((user: Partial<User>) => user.createdAt);
      const userListTimestamp: number[] = [...new Set(userListCreatedAt.map((date: Date) => date.getTime()))];
      const userListMinimum: number = Math.min(...userListTimestamp);

      // prettier-ignore
      const userListRange: Dayjs[] = request.server.dayjsPlugin.getRange(request.server.dayjs(userListMinimum), request.server.dayjs(), 'day');
      const userListPromise: Promise<number>[] = userListRange.map((date: Dayjs) => {
        return request.server.prisma.user.count({
          where: {
            createdAt: {
              lte: request.server.dayjsPlugin.getEndOf(date)
            }
          }
        });
      });

      const userListCount: number[] = await Promise.all(userListPromise);
      const userListInsight: any[] = userListRange.map((date: Dayjs, i: number) => {
        return {
          date: request.server.dayjsPlugin.getEndOf(date),
          count: userListCount[i]
        };
      });

      return reply.status(200).send({
        data: userListInsight,
        statusCode: 200
      });
    }
  });
}
