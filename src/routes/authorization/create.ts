/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { POSTCategory } from '../../types/requests';
import { CookieSerializeOptions } from '@fastify/cookie';

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

      const configList: Record<string, CookieSerializeOptions> = {
        development: {
          path: '/',
          httpOnly: true
        },
        production: {
          domain: request.server.config.APP_HOST,
          path: '/',
          secure: true,
          httpOnly: true,
          sameSite: true
        }
      };

      reply
        .setCookie(request.server.config.COOKIE_NAME, token, configList[request.server.config.NODE_ENV])
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
