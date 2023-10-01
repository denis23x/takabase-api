/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { POSTCategory } from '../../types/requests';
import { CookieSerializeOptions } from '@fastify/cookie';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: '',
    schema: {
      tags: ['Authorization'],
      description: 'Removes specific Token',
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
          expires: new Date()
        },
        production: {
          expires: new Date()
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
