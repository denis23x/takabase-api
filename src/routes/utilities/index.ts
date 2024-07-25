/** @format */

import insightsMethod from './insights';
import type { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(insightsMethod);
}
