/** @format */

import { FastifyInstance } from 'fastify';

import getAll from './users/get-all';
import getOne from './users/get-one';

export default async function (fastify: FastifyInstance) {
  // List all categories, paginated
  fastify.register(getAll);

  // Get one category
  fastify.register(getOne);
}
