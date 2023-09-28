/** @format */

import { FastifyInstance } from 'fastify';

import getAll from './categories/get-all';
import getOne from './categories/get-one';

export default async function (fastify: FastifyInstance) {
  // List all categories, paginated
  fastify.register(getAll);

  // Get one category
  fastify.register(getOne);
}
