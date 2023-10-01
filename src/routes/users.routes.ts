/** @format */

import { FastifyInstance } from 'fastify';

import createMethod from './users/create';
import deleteMethod from './users/delete';
import getAllMethod from './users/get-all';
import getOneMethod from './users/get-one';
import updateMethod from './users/update';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(createMethod);
  fastify.register(deleteMethod);
  fastify.register(getAllMethod);
  fastify.register(getOneMethod);
  fastify.register(updateMethod);
}
