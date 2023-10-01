/** @format */

import { FastifyInstance } from 'fastify';

import create from './categories/create';
import getAll from './categories/get-all';
import getOne from './categories/get-one';
import update from './categories/update';

export default async function (fastify: FastifyInstance) {
  fastify.register(create);
  fastify.register(getAll);
  fastify.register(getOne);
  fastify.register(update);
}
