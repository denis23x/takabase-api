/** @format */

import { FastifyInstance } from 'fastify';

import getAll from './posts/get-all';
import getOne from './posts/get-one';

export default async function (fastify: FastifyInstance) {
  fastify.register(getAll);
  fastify.register(getOne);
}
