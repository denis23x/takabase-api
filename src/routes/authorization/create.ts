/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CreateAuthorization } from '../../types/requests';
import { Prisma, User } from '../../database/client';
import { CookieSerializeOptions } from '@fastify/cookie';
import { cookieConfigResponse } from '../../config/cookie.config';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    schema: {
      tags: ['Authorization'],
      description: 'Creates a new Token',
      body: {
        type: 'object',
        properties: {
          firebaseId: {
            type: 'string'
          }
        },
        required: ['firebaseId'],
        additionalProperties: false
      },
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
        400: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<CreateAuthorization>, reply: FastifyReply): Promise<any> {
      const { firebaseId }: Record<string, string> = request.body;

      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaService.getUserSelect(),
          firebaseId: true
        },
        where: {
          firebaseId
        }
      };

      await reply.server.prisma.user
        .findUniqueOrThrow(userFindUniqueOrThrowArgs)
        .then((user: User) => {
          const jwt: string = request.server.jwt.sign({
            id: user.id,
            firebaseId: user.firebaseId
          });

          const cookieOptions: CookieSerializeOptions = {
            ...cookieConfigResponse[request.server.config.NODE_ENV],
            expires: new Date(Date.now() + Number(request.server.config.JWT_TTL))
          };

          return reply.setCookie('jwt-token', jwt, cookieOptions).status(200).send({
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
