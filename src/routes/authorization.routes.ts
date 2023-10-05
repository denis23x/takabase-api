/** @format */

import { FastifyInstance } from 'fastify';

import createMethod from './authorization/create';
import getOneMethod from './authorization/get-one';
import deleteMethod from './authorization/delete';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(createMethod);
  fastify.register(getOneMethod);
  fastify.register(deleteMethod);
}
