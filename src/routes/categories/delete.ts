/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post, Prisma } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Categories'],
      description: 'Removes specific Category from the database',
      security: [
        {
          Authorization: []
        }
      ],
      params: {
        $ref: 'paramsIdSchema#'
      },
      querystring: {
        type: 'object',
        properties: {
          categoryId: {
            type: 'number'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                message: {
                  type: 'string'
                }
              }
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
    handler: async function (request: FastifyRequest<ParamsId & QuerystringSearch>, reply: FastifyReply): Promise<any> {
      const { categoryId }: Record<string, any> = request.query;

      /** Delete category */

      const setCategoryDelete = () => {
        const categoryDeleteArgs: Prisma.CategoryDeleteArgs = {
          where: {
            id: Number(request.params.id),
            userId: Number(request.user.id)
          }
        };

        return reply.server.prisma.category.delete(categoryDeleteArgs);
      };

      /** Delete category related posts */

      const setCategoryPostListDelete = () => {
        const postDeleteManyArgs: Prisma.PostDeleteManyArgs = {
          where: {
            userId: Number(request.user.id),
            categoryId: Number(request.params.id)
          }
        };

        return reply.server.prisma.post.deleteMany(postDeleteManyArgs);
      };

      /** Transfer category related posts to another category */

      const setCategoryPostListTransfer = () => {
        const postUpdateManyArgs: Prisma.PostUpdateManyArgs = {
          where: {
            userId: Number(request.user.id),
            categoryId: Number(request.params.id)
          },
          data: {
            categoryId
          }
        };

        return reply.server.prisma.post.updateMany(postUpdateManyArgs);
      };

      try {
        if (categoryId) {
          await reply.server.prisma.$transaction([setCategoryPostListTransfer(), setCategoryDelete()]);
        } else {
          const postFindManyArgs: Prisma.PostFindManyArgs = {
            select: {
              firebaseUid: true
            },
            where: {
              userId: Number(request.user.id),
              categoryId: Number(request.params.id)
            }
          };

          /** Get all post firebaseUid before delete them */

          const postList: Partial<Post>[] = await reply.server.prisma.post.findMany(postFindManyArgs);

          /** Delete category related posts and category */

          await reply.server.prisma.$transaction([setCategoryPostListDelete(), setCategoryDelete()]);

          /** Delete markdown images */

          // prettier-ignore
          await Promise.all(postList.map((post: Partial<Post>) => {
            const postFirebaseUid: string = String(post.firebaseUid);
            const userFirebaseUid: string = String(request.user.firebaseUid);

            return request.server.storage.getBucketImageListPostDelete(userFirebaseUid, postFirebaseUid);
          }));
        }

        return reply.status(200).send({
          data: {
            message: 'Category successfully deleted'
          },
          statusCode: 200
        });
      } catch (error: any) {
        return reply.server.prismaService.setError(reply, error);
      }
    }
  });
}
