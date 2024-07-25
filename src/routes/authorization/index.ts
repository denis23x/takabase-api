/** @format */

import appCheckMethod from './app-check';
import profileMethod from './profile';
import logoutRevokeMethod from './logout-revoke';
import type { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(appCheckMethod);
  fastify.register(profileMethod);
  fastify.register(logoutRevokeMethod);
}
