/** @format */

import { FastifyInstance } from 'fastify';

import createMethod from './authorization/create';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(createMethod);
}
