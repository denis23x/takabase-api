/** @format */

import { FastifyInstance } from 'fastify';

import createMethod from './posts/create';
import deleteMethod from './posts/delete';
import getAllMethod from './posts/get-all';
import getOneMethod from './posts/get-one';
import updateMethod from './posts/update';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(createMethod);
  fastify.register(deleteMethod);
  fastify.register(getAllMethod);
  fastify.register(getOneMethod);
  fastify.register(updateMethod);
}
