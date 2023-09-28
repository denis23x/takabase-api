/** @format */

import { FastifyInstance } from 'fastify';

import getAll from './posts/get-all';
import getOne from './posts/get-one';

export default async function (fastify: FastifyInstance) {
  // List all categories, paginated
  fastify.register(getAll);

  // Get one category
  fastify.register(getOne);
}
