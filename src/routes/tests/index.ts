/** @format */

import { FastifyInstance } from 'fastify';

import dummyMethod from './dummy';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(dummyMethod);
}
