/** @format */

import { FastifyInstance } from 'fastify';

import appCheckMethod from './app-check';
import profileMethod from './profile';
import logoutRevokeMethod from './logout-revoke';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(appCheckMethod);
  fastify.register(profileMethod);
  fastify.register(logoutRevokeMethod);
}
