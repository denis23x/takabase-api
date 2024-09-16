/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { InsightsGetDto } from '../../types/dto/insights/insights-get';
import type { Insights } from '../../database/client';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    schema: {
      tags: ['Insights'],
      description: 'Get insights',
      querystring: {
        type: 'object',
        properties: {
          value: {
            $ref: 'partsInsightsValueSchema#'
          },
          unit: {
            $ref: 'partsInsightsUnitSchema#'
          }
        },
        required: ['value', 'unit']
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              $ref: 'insightsSchema#'
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
    handler: async function (request: FastifyRequest<InsightsGetDto>, reply: FastifyReply): Promise<any> {
      const { value, unit }: Record<string, any> = request.query;

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

      // Insights

      const insightsPreceding: Partial<Insights> = await request.server.prisma.insights
        .findUnique({
          select: request.server.prismaPlugin.getInsightsSelect(),
          where: {
            unix: request.server.dayjs().subtract(value, unit).utc().endOf('day').unix()
          }
        })
        .then((insights: null | Partial<Insights>) => {
          // prettier-ignore
          return insights || request.server.prisma.insights.findFirst({
            select: request.server.prismaPlugin.getInsightsSelect()
          });
        });

      const insightsFollowing: Partial<Insights> = await request.server.prisma.insights.findFirst({
        select: request.server.prismaPlugin.getInsightsSelect(),
        orderBy: {
          id: 'desc'
        }
      });

      if (insightsPreceding && insightsFollowing) {
        const categoryChangePercent: number = getChange(insightsPreceding.categories, insightsFollowing.categories);
        const categoryChangeState: string = getChangeState(categoryChangePercent);

        const postChangePercent: number = getChange(insightsPreceding.posts, insightsFollowing.posts);
        const postChangeState: string = getChangeState(postChangePercent);

        const userChangePercent: number = getChange(insightsPreceding.users, insightsFollowing.users);
        const userChangeState: string = getChangeState(userChangePercent);

        return reply.status(200).send({
          data: {
            categories: {
              countPreceding: insightsPreceding.categories,
              countFollowing: insightsFollowing.categories,
              changeState: categoryChangeState,
              changePercent: categoryChangePercent
            },
            posts: {
              countPreceding: insightsPreceding.posts,
              countFollowing: insightsFollowing.posts,
              changeState: postChangeState,
              changePercent: postChangePercent
            },
            users: {
              countPreceding: insightsPreceding.users,
              countFollowing: insightsFollowing.users,
              changeState: userChangeState,
              changePercent: userChangePercent
            }
          },
          statusCode: 200
        });
      }

      return reply.status(200).send({
        data: {},
        statusCode: 200
      });
    }
  });
}
