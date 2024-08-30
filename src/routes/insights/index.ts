/** @format */

import createMethod from './create';
import getAllMethod from './get-all';
import type { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(createMethod);
  fastify.register(getAllMethod);
}
