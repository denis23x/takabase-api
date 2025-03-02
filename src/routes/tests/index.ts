/** @format */

import dummyMethod from './dummy';
import type { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(dummyMethod);
}
