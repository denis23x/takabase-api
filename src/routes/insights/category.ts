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
      tags: ['Insights'],
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
      const categoryListCreatedAt: Dayjs[] = categoryList.map((category: Partial<Category>) => {
        return request.server.dayjs(category.createdAt).utc();
      });

      const categoryListMinimum: Dayjs = request.server.dayjsPlugin.getMin(categoryListCreatedAt);
      const categoryListStart: Dayjs = request.server.dayjs(categoryListMinimum).utc().endOf('day');
      const categoryListEnd: Dayjs = request.server.dayjs().utc().endOf('day');
      const categoryListRange: Dayjs[] = request.server.dayjsPlugin.getRange(categoryListStart, categoryListEnd, 'day');
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
