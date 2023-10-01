/** @format */

import { FastifyInstance } from 'fastify';

import create from './posts/create';
import getAll from './posts/get-all';
import getOne from './posts/get-one';
import update from './posts/update';

export default async function (fastify: FastifyInstance) {
  fastify.register(create);
  fastify.register(getAll);
  fastify.register(getOne);
  fastify.register(update);
}
