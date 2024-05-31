/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { DecodedIdToken } from 'firebase-admin/lib/auth';

const authPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('auth', getAuth(fastifyInstance.firebase()));

  fastifyInstance.decorateRequest('user', null);

  // prettier-ignore
  fastifyInstance.decorate('verifyIdToken', async function (request: FastifyRequest, reply: FastifyReply): Promise<DecodedIdToken | void> {
    const authorization: string | undefined = request.headers.authorization;

    if (authorization && authorization.includes('Bearer')) {
      const token: string = authorization.replace('Bearer', '').trim();

      return request.server.auth
        .verifyIdToken(token)
        .then((decodedIdToken: DecodedIdToken) => (request.user = decodedIdToken));
    }

    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Unauthorized request',
      statusCode: 401
    });
  });
});

export default authPlugin;
