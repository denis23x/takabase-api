/** @format */

import { FastifyInstance } from 'fastify';

import profileMethod from './profile';
import logoutRevokeMethod from './logout-revoke';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(profileMethod);
  fastify.register(logoutRevokeMethod);
}
