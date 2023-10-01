/** @format */

import { FastifyInstance } from 'fastify';

import create from './users/create';
import getAll from './users/get-all';
import getOne from './users/get-one';
import update from './users/update';

export default async function (fastify: FastifyInstance) {
  fastify.register(create);
  fastify.register(getAll);
  fastify.register(getOne);
  fastify.register(update);
}
