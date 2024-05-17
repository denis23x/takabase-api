/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: 'logout/revoke',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Authorization'],
      description: 'Revoke refresh tokens ',
      security: [
        {
          Authorization: []
        }
      ],
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'object'
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest, reply: FastifyReply): Promise<any> {
      // Extract the firebaseUid from the authenticated user
      const firebaseUid: string = String(request.user.firebaseUid);

      // Revoke all refresh tokens associated with the user's firebaseUid
      await request.server.auth
        .revokeRefreshTokens(firebaseUid)
        .then(() => {
          return reply.status(200).send({
            data: {
              status: 'Ok'
            },
            statusCode: 200
          });
        })
        .catch(() => {
          const responseError: ResponseError = {
            error: 'Internal Server Error',
            message: 'auth/internal-error',
            statusCode: 500
          };

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
