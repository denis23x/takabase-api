/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { User } from '../database/client';

const jwtPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (error: any) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: error.message,
        statusCode: 401
      });
    }
  });

  fastifyInstance.decorate('authenticateHandler', {
    signUser: (user: User): string => {
      return fastifyInstance.jwt.sign({
        id: user.id,
        firebaseId: user.firebaseId
      });
    }
  });
});

export default jwtPlugin;
