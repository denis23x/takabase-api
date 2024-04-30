/** @format */

import { FastifyInstance } from 'fastify';

import loginMethod from './login';
import logoutRevokeMethod from './logout-revoke';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(loginMethod);
  fastify.register(logoutRevokeMethod);
}
