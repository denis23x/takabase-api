/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

const jwtPlugin: FastifyPluginAsync = fp(async function prismaPlugin(fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify({
        onlyCookie: true
      });
    } catch (error: any) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: error.message,
        statusCode: 401
      });
    }
  });
});

export default jwtPlugin;
