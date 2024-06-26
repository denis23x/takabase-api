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
        .verifyIdToken(token, true)
        .then((decodedIdToken: DecodedIdToken) => (request.user = decodedIdToken));
    }

    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Unauthorized request',
      statusCode: 401
    });
  });

  // prettier-ignore
  fastifyInstance.decorate('verifyAdmin', async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const email: string = request.user.email;
    const emailAdminList: string[] = [
      'damage.23x@gmail.com'
    ];

    if (!email || !emailAdminList.includes(email)) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Unauthorized request',
        statusCode: 401
      });
    }
  });

  // prettier-ignore
  fastifyInstance.decorate('verifyUsername', async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // @ts-ignore
    const username: string = String(request.body.name || '');
    const usernameForbidden: string[] = await request.server.remoteConfigPlugin.getForbiddenUsername();

    if (usernameForbidden.indexOf(username.trim().toLowerCase()) !== -1) {
      reply.status(400).send({
        message: 'Username "' + username + '" is not allowed',
        error: 'Bad request',
        statusCode: 400
      });
    }
  });
});

export default authPlugin;
