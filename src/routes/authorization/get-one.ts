/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, User } from '../../database/client';
import { CookieSerializeOptions } from '@fastify/cookie';
import { cookieConfigResponse } from '../../config/cookie.config';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: '',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Authorization'],
      description: 'Get an authorized user',
      security: [
        {
          Authorization: ['token']
        }
      ],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              $ref: 'userSchema#'
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
    handler: async function (request: FastifyRequest, reply: FastifyReply): Promise<any> {
      const { email }: any = request.user;

      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: request.server.prismaService.getUserSelect(),
        where: {
          email
        }
      };

      const cookieOptions: CookieSerializeOptions = {
        ...cookieConfigResponse[request.server.config.NODE_ENV],
        signed: false,
        httpOnly: false,
        encode: (value: string): string => value,
        expires: new Date(Date.now() + Number(request.server.config.JWT_TTL))
      };

      return request.server.prisma.user
        .findUniqueOrThrow(userFindUniqueOrThrowArgs)
        .then((user: User) => {
          return reply.setCookie('jwt-user', JSON.stringify(user), cookieOptions).status(200).send({
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
