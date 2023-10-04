/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';

const jwtPlugin: FastifyPluginAsync = fp(async function prismaPlugin(fastifyInstance: FastifyInstance) {
  fastifyInstance.register(fastifyJwt, {
    secret: fastifyInstance.config.JWT_SECRET,
    cookie: {
      cookieName: fastifyInstance.config.JWT_NAME,
      signed: false
    },
    sign: {
      expiresIn: String(fastifyInstance.config.JWT_TTL) + 'ms'
    }
  });

  fastifyInstance.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify({
        onlyCookie: false
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
