/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { initializeApp } from 'firebase-admin/app';

const firebasePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('firebase', initializeApp());

  fastifyInstance.decorate('firebaseService', {
    getCategorySelect: () => {
      return 'denis';
    }
  });
});

export default firebasePlugin;
