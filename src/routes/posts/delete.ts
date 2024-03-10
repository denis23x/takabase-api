/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Post, Prisma, PrismaClient } from '../../database/client';
import { ParamsId } from '../../types/crud/params/params-id';
import { QuerystringSearch } from '../../types/crud/querystring/querystring-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Posts'],
      description: 'Removes specific Post from the database',
      security: [
        {
          Authorization: []
        }
      ],
      params: {
        $ref: 'paramsIdSchema#'
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
    handler: async function (request: FastifyRequest<ParamsId & QuerystringSearch>, reply: FastifyReply): Promise<any> {
      const postDeleteArgs: Prisma.PostDeleteArgs = {
        select: {
          ...request.server.prismaService.getPostSelect(),
          firebaseUid: true
        },
        where: {
          userId: Number(request.user.id),
          id: Number(request.params.id)
        }
      };

      // prettier-ignore
      await request.server.prisma.$transaction(async (prisma: PrismaClient): Promise<void> => {
        await prisma.post
          .delete(postDeleteArgs)
          .then(async (post: Post) => {
            const postFirebaseUid: string = String(post.firebaseUid);
            const userFirebaseUid: string = String(request.user.firebaseUid);

            const markdownImageListDone: string[] = await request.server.storageService.getBucketImageListPostDelete(
              postFirebaseUid,
              userFirebaseUid
            );

            return reply.status(200).send({
              data: {
                ...post,
                markdownImageList: markdownImageListDone
              },
              statusCode: 200
            });
          })
          .catch((error: Error) => {
            return reply.server.prismaService.setError(reply, error);
          });
      });
    }
  });
}
