/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppCheckToken } from 'firebase-admin/app-check';
import type { AppCheckDto } from '../../types/dto/authorization/app-check';
import type { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: 'app-check',
    schema: {
      tags: ['Authorization'],
      description: 'Retrieve app check token',
      body: {
        type: 'object',
        properties: {
          appId: {
            type: 'string'
          }
        },
        required: ['appId']
      },
      response: {
        '200': {
          $ref: 'partsAppCheckResponseSchema#'
        },
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<AppCheckDto>, reply: FastifyReply): Promise<any> {
      await request.server.appCheck
        .createToken(request.body.appId)
        .then((appCheckToken: AppCheckToken) => {
          return reply.status(200).send({
            data: {
              ...appCheckToken,
              expireTimeMillis: Math.floor(Date.now() / 1000) + 60 * 60
            },
            statusCode: 200
          });
        })
        .catch((error: any) => {
          const responseError: ResponseError = {
            error: 'Internal Server Error',
            message: error.errorInfo.code,
            statusCode: 500
          };

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
