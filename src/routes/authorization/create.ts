/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { POSTCategory } from '../../types/requests';
import { CookieSerializeOptions } from '@fastify/cookie';
import { cookieConfigResponse } from '../../config/cookie.config';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    schema: {
      tags: ['Authorization'],
      description: 'Creates a new Token',
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
    handler: async function (request: FastifyRequest<POSTCategory>, reply: FastifyReply): Promise<any> {
      const token: string = request.server.jwt.sign({
        denis: '123'
      });

      const cookieOptions: CookieSerializeOptions = {
        ...cookieConfigResponse[request.server.config.NODE_ENV],
        expires: new Date(Date.now() + Number(request.server.config.JWT_TTL))
      };

      reply
        .setCookie(request.server.config.JWT_NAME, token, cookieOptions)
        .code(200)
        .send({
          data: {
            token: token
          },
          statusCode: 200
        });
    }
  });
}
