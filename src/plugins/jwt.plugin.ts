/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';

const jwtPlugin: FastifyPluginAsync = fp(async function prismaPlugin(fastifyInstance: FastifyInstance) {
  fastifyInstance.register(fastifyJwt, {
    secret: 'foobar',
    cookie: {
      cookieName: 'token',
      signed: false
    }
  });

  fastifyInstance.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});

export default jwtPlugin;
