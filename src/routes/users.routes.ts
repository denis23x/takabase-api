/** @format */

import { FastifyInstance } from 'fastify';

import getAll from './users/get-all';
import getOne from './users/get-one';

export default async function (fastify: FastifyInstance) {
  fastify.register(getAll);
  fastify.register(getOne);
}
