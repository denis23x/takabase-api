/** @format */

import { FastifyInstance, FastifyRequest } from 'fastify';
import type { Prisma } from '../../database/client';
import { CrudIdRequest } from '../../types/requests';

export default async function (fastify: FastifyInstance) {
  fastify.route({
    method: 'GET',
    url: '/:id',
    schema: {
      params: {
        $ref: 'requestParameterIdSchema#'
      },
      querystring: {
        type: 'object',
        properties: {
          scope: {
            type: 'array',
            collectionFormat: 'multi',
            items: {
              type: 'string'
            },
            default: ['category', 'user']
          }
        }
      },
      tags: ['Posts'],
      description: 'Get a single post',
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
        404: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<CrudIdRequest>, reply) {
      const { id }: Record<string, number> = request.params;
      const { scope }: Record<string, any> = request.query;

      const postFindUniqueArgs: Prisma.PostFindUniqueArgs = {
        select: {
          id: true,
          name: true,
          description: true,
          markdown: true,
          image: true,
          userId: true,
          categoryId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        },
        where: {
          id
        }
      };

      /** Scope */

      console.log(request.query);
      console.log(scope);

      if (scope) {
        if (scope.includes('category')) {
          postFindUniqueArgs.select = {
            ...postFindUniqueArgs.select,
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true
              }
            }
          };
        }

        if (scope.includes('user')) {
          postFindUniqueArgs.select = {
            ...postFindUniqueArgs.select,
            user: {
              select: {
                id: true,
                facebookId: true,
                githubId: true,
                googleId: true,
                name: true,
                description: true,
                avatar: true,
                email: true,
                emailConfirmed: true,
                password: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true
              }
            }
          };
        }
      }

      const data: any = await request.server.prisma.post.findUnique(postFindUniqueArgs);

      if (data === null) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Post not found',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        data,
        statusCode: 200
      });
    }
  });
}
