/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { initializeApp, cert } from 'firebase-admin/app';

const firebasePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  // prettier-ignore
  fastifyInstance.decorate('firebase', initializeApp({
    credential: cert(process.env.FIREBASE_ADMIN_SDK)
  }));
});

export default firebasePlugin;
