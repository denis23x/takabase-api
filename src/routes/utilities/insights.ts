/** @format */

import dayjs from 'dayjs';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { InsightGetDto } from '../../types/dto/insight/insight-get';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'insights',
    schema: {
      tags: ['Utilities'],
      description: 'Get insights',
      querystring: {
        type: 'object',
        properties: {
          value: {
            type: 'number'
          },
          unit: {
            type: 'string'
          }
        },
        required: ['value', 'unit']
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                categories: {
                  $ref: 'insightSchema#'
                },
                posts: {
                  $ref: 'insightSchema#'
                },
                users: {
                  $ref: 'insightSchema#'
                }
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
    handler: async function (request: FastifyRequest<InsightGetDto>, reply: FastifyReply): Promise<any> {
      const { value, unit }: Record<string, any> = request.query;

      const getPreceding = (): string => dayjs().subtract(value, unit).toISOString();

      const getChangeState = (percent: number): string => {
        return percent === 0 ? 'stasis' : percent > 0 ? 'positive' : 'negative';
      };

      const getChange = (oldCount: number, newCount: number): number => {
        if (oldCount === 0) {
          return newCount > 0 ? 100 : -100;
        } else {
          return ((newCount - oldCount) / oldCount) * 100;
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

      const categoryFollowing: number = await request.server.prisma.category.count({
        where: {
          createdAt: {
            gte: getPreceding()
          }
        }
      });

      const categoryChange: number = getChange(categoryPreceding, categoryPreceding + categoryFollowing);

      // Post stat

      const postPreceding: number = await request.server.prisma.post.count({
        where: {
          createdAt: {
            lte: getPreceding()
          }
        }
      });

      const postFollowing: number = await request.server.prisma.post.count({
        where: {
          createdAt: {
            gte: getPreceding()
          }
        }
      });

      const postChange: number = getChange(postPreceding, postPreceding + postFollowing);

      // User stat

      const userPreceding: number = await request.server.prisma.user.count({
        where: {
          createdAt: {
            lte: getPreceding()
          }
        }
      });

      const userFollowing: number = await request.server.prisma.user.count({
        where: {
          createdAt: {
            gte: getPreceding()
          }
        }
      });

      const userChange: number = getChange(userPreceding, userPreceding + userFollowing);

      return reply.status(200).send({
        data: {
          categories: {
            countPreceding: categoryPreceding,
            countFollowing: categoryFollowing,
            changeState: getChangeState(categoryChange),
            changePercent: categoryChange
          },
          posts: {
            countPreceding: postPreceding,
            countFollowing: postFollowing,
            changeState: getChangeState(postChange),
            changePercent: postChange
          },
          users: {
            countPreceding: userPreceding,
            countFollowing: userFollowing,
            changeState: getChangeState(userChange),
            changePercent: userChange
          }
        },
        statusCode: 200
      });
    }
  });
}
