/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, User } from '../../database/client';
import { CRUDIdRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    schema: {
      tags: ['Posts'],
      description: 'Removes specific Post from the database',
      security: [
        {
          Authorization: ['token']
        }
      ],
      params: {
        $ref: 'requestParameterIdSchema#'
      },
      headers: {
        type: 'object',
        properties: {
          userId: {
            type: 'number'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              $ref: 'postSchema#'
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        400: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<CRUDIdRequest>, reply: FastifyReply): Promise<any> {
      const { id }: Record<string, number> = request.params;

      const postDeleteArgs: Prisma.PostDeleteArgs = {
        select: request.server.prismaService.getPostSelect(),
        where: {
          id
        }
      };

      return request.server.prisma.post
        .delete(postDeleteArgs)
        .then((user: User) => {
          return reply.status(200).send({
            data: user,
            statusCode: 200
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.getResponseError(reply, error);
        });
    }
  });
}
