/** @format */

import dayjs from 'dayjs';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'insights',
    schema: {
      tags: ['Utilities'],
      description: 'Get insights',
      response: {
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<any>, reply: FastifyReply): Promise<any> {
      const getPreceding = (): string => dayjs().subtract(1, 'month').toISOString();
      const getChange = (oldCount: number, newCount: number): string => {
        if (oldCount === 0) {
          return (newCount > 0 ? 100 : -100).toString();
        } else {
          return (((newCount - oldCount) / oldCount) * 100).toFixed();
        }
      };

      // Category stat

      const categoryPreceding: number = await request.server.prisma.category.count({
        where: {
          createdAt: {
            lte: getPreceding()
          }
        }
      });

      const categoryLastMonth: number = await request.server.prisma.category.count({
        where: {
          createdAt: {
            gte: getPreceding()
          }
        }
      });

      // Post stat

      const postPreceding: number = await request.server.prisma.post.count({
        where: {
          createdAt: {
            lte: getPreceding()
          }
        }
      });

      const postLastMonth: number = await request.server.prisma.post.count({
        where: {
          createdAt: {
            gte: getPreceding()
          }
        }
      });

      // User stat

      const userPreceding: number = await request.server.prisma.user.count({
        where: {
          createdAt: {
            lte: getPreceding()
          }
        }
      });

      const userLastMonth: number = await request.server.prisma.user.count({
        where: {
          createdAt: {
            gte: getPreceding()
          }
        }
      });

      return reply.status(200).send({
        data: {
          categories: {
            countPreceding: categoryPreceding,
            countLastMonth: categoryLastMonth,
            isPositive: parseFloat(getChange(categoryPreceding, categoryLastMonth)) > 0,
            changePercent: getChange(categoryPreceding, categoryLastMonth) + '%'
          },
          posts: {
            countPreceding: postPreceding,
            countLastMonth: postLastMonth,
            isPositive: parseFloat(getChange(categoryPreceding, categoryLastMonth)) > 0,
            changePercent: getChange(postPreceding, postLastMonth) + '%'
          },
          users: {
            countPreceding: userPreceding,
            countLastMonth: userLastMonth,
            isPositive: parseFloat(getChange(categoryPreceding, categoryLastMonth)) > 0,
            changePercent: getChange(userPreceding, userLastMonth) + '%'
          }
        },
        statusCode: 200
      });
    }
  });
}
