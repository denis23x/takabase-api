/** @format */

import { FastifyInstance } from 'fastify';

import createMethod from './categories/create';
import deleteMethod from './categories/delete';
import getAllMethod from './categories/get-all';
import getOneMethod from './categories/get-one';
import updateMethod from './categories/update';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(createMethod);
  fastify.register(deleteMethod);
  fastify.register(getAllMethod);
  fastify.register(getOneMethod);
  fastify.register(updateMethod);
}
