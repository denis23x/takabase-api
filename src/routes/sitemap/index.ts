/** @format */

import categoryMethod from './category';
import postMethod from './post';
import userMethod from './user';
import type { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(categoryMethod);
  fastify.register(postMethod);
  fastify.register(userMethod);
}
