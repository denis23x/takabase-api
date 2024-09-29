/** @format */

import metadataMethod from './metadata';
import type { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.register(metadataMethod);
}
