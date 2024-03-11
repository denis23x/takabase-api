/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { initializeApp, App } from 'firebase-admin/app';

const firebasePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('firebase', {
    getApp: (): App => initializeApp()
  });
});

export default firebasePlugin;
