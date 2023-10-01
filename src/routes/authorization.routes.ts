/** @format */

import { FastifyInstance } from 'fastify';

import createMethod from './authorization/create';
import deleteMethod from './authorization/delete';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(createMethod);
  fastify.register(deleteMethod);
}
