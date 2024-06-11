/** @format */

import { FastifyInstance } from 'fastify';

import categoryMethod from './category';
import postMethod from './post';
import userMethod from './user';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(categoryMethod);
  fastify.register(postMethod);
  fastify.register(userMethod);
}
