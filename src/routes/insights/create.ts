/** @format */

import type { Dayjs, ManipulateType } from 'dayjs';
import type { InsightsCreateDto } from '../../types/dto/insights/insights-create';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: [fastify.verifyIdToken, fastify.verifyAdmin],
    schema: {
      tags: ['Insights'],
      description: 'Seed database with Insights',
      body: {
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
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      response: {
        '201': {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'string'
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
    handler: async function (request: FastifyRequest<InsightsCreateDto>, reply: FastifyReply): Promise<void> {
      const { value, unit }: Record<string, ManipulateType | number> = request.body;

      // prettier-ignore
      const listStart: Dayjs = request.server.dayjs(request.server.dayjs().subtract(value as number, unit as ManipulateType)).utc().endOf('day');
      const listEnd: Dayjs = request.server.dayjs().utc().endOf('day');
      const listRange: Dayjs[] = request.server.dayjsPlugin.getRange(listStart, listEnd, 'day');

      const categoryListPromise: Promise<number>[] = listRange.map((date: Dayjs) => {
        return request.server.prisma.category.count({
          where: {
            createdAt: {
              lte: date.utc().endOf('day')
            }
          }
        });
      });
      const categoryListCount: number[] = await Promise.all(categoryListPromise);

      const postListPromise: Promise<number>[] = listRange.map((date: Dayjs) => {
        return request.server.prisma.post.count({
          where: {
            createdAt: {
              lte: date.utc().endOf('day')
            }
          }
        });
      });
      const postListCount: number[] = await Promise.all(postListPromise);

      const userListPromise: Promise<number>[] = listRange.map((date: Dayjs) => {
        return request.server.prisma.user.count({
          where: {
            createdAt: {
              lte: date.utc().endOf('day')
            }
          }
        });
      });
      const userListCount: number[] = await Promise.all(userListPromise);

      const insights: string[] = listRange
        .map((date: Dayjs, i: number) => {
          const categories: number = categoryListCount[i];
          const posts: number = postListCount[i];
          const users: number = userListCount[i];
          const unix: number = date.utc().endOf('day').unix();

          return `(${unix}, ${categories}, ${posts}, ${users})`;
        })
        .filter((insight: string) => !/0,\s0,\s0/g.test(insight));

      // RAW query
      // prettier-ignore
      await request.server.prisma
        .$queryRawUnsafe(`
          INSERT INTO Insights (unix, categories, posts, users)
          VALUES ${insights.join(',')}
          ON DUPLICATE KEY UPDATE
            categories = VALUES(categories),
            posts = VALUES(posts),
            users = VALUES(users);
        `)
        .then(() => {
          return reply.status(200).send({
            data: insights,
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
