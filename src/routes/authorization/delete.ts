/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { POSTCategory } from '../../types/requests';
import { CookieSerializeOptions } from '@fastify/cookie';
import { cookieConfigResponse } from '../../config/cookie.config';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: '',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Authorization'],
      description: 'Removes specific Token',
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
      const cookieOptions: CookieSerializeOptions = {
        ...cookieConfigResponse[request.server.config.NODE_ENV],
        expires: new Date()
      };

      reply
        .clearCookie('jwt-token', cookieOptions)
        .clearCookie('jwt-user', cookieOptions)
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
