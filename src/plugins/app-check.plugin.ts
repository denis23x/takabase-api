/** @format */

import fp from 'fastify-plugin';
import { getAppCheck } from 'firebase-admin/app-check';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { AppCheck } from 'firebase-admin/app-check';

const appCheckPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  const appCheck: AppCheck = getAppCheck(fastifyInstance.firebase());

  fastifyInstance.decorate('appCheck', appCheck);
});

export default appCheckPlugin;
