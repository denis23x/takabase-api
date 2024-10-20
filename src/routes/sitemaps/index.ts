/** @format */

import categoriesMethod from './categories';
import postsMethod from './posts';
import usersMethod from './users';
import type { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(categoriesMethod);
  fastify.register(postsMethod);
  fastify.register(usersMethod);
}
