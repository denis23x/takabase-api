/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { POSTAuthorization } from '../../types/requests';
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
              type: 'object',
              properties: {
                token: {
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
    handler: async function (request: FastifyRequest<POSTAuthorization>, reply: FastifyReply): Promise<any> {
      const { firebaseId }: Record<string, string> = request.body;

      const tokenJWT: string = request.server.jwt.sign({ firebaseId });

      const cookieOptions: CookieSerializeOptions = {
        ...cookieConfigResponse[request.server.config.NODE_ENV],
        expires: new Date(Date.now() + Number(request.server.config.JWT_TTL))
      };

      reply
        .setCookie('jwt-token', tokenJWT, cookieOptions)
        .code(200)
        .send({
          data: {
            token: 'ok!'
          },
          statusCode: 200
        });
    }
  });
}
