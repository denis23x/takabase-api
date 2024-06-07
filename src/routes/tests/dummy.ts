/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: 'dummy',
    schema: {
      tags: ['Tests'],
      description: 'Test endpoint no special purpose',
      response: {
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<any>, reply: FastifyReply): Promise<any> {
      return reply.status(200).send({
        data: {
          message: 'Hi'
        },
        statusCode: 200
      });
    }
  });
}
