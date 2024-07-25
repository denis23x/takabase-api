/** @format */

import createMethod from './create';
import deleteMethod from './delete';
import getAllMethod from './get-all';
import getOneMethod from './get-one';
import updateMethod from './update';
import type { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(createMethod);
  fastify.register(deleteMethod);
  fastify.register(getAllMethod);
  fastify.register(getOneMethod);
  fastify.register(updateMethod);
}
