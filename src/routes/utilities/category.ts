/** @format */

import { Prisma } from '../../database/client';
import type { Dayjs } from 'dayjs';
import type { Category } from '../../database/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'category',
    // onRequest: [fastify.verifyIdToken, fastify.verifyAdmin],
    schema: {
      tags: ['Utilities'],
      description: 'Seed database with Category insights',
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
      const categoryFindManyArgs: Prisma.CategoryFindManyArgs = {
        select: {
          createdAt: true
        }
      };

      const categoryList: Partial<Category>[] = await request.server.prisma.category.findMany(categoryFindManyArgs);
      const categoryListCreatedAt: Date[] = categoryList.map((category: Partial<Category>) => category.createdAt);
      const categoryListTimestamp: number[] = [...new Set(categoryListCreatedAt.map((date: Date) => date.getTime()))];
      const categoryListMinimum: number = Math.min(...categoryListTimestamp);

      // prettier-ignore
      const categoryListRange: Dayjs[] = request.server.dayjsPlugin.getRange(request.server.dayjs(categoryListMinimum), request.server.dayjs(), 'day');
      const categoryListPromise: Promise<number>[] = categoryListRange.map((date: Dayjs) => {
        return request.server.prisma.category.count({
          where: {
            createdAt: {
              lte: request.server.dayjsPlugin.getEndOf(date)
            }
          }
        });
      });

      const categoryListCount: number[] = await Promise.all(categoryListPromise);
      const categoryListInsight: any[] = categoryListRange.map((date: Dayjs, i: number) => {
        return {
          date: request.server.dayjsPlugin.getEndOf(date),
          count: categoryListCount[i]
        };
      });

      return reply.status(200).send({
        data: categoryListInsight,
        statusCode: 200
      });
    }
  });
}
