/** @format */

import fp from 'fastify-plugin';
import { Redis } from '@upstash/redis';
import { redisConfig } from '../config/redis.config';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const redisPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  const redis: Redis = new Redis(redisConfig);

  fastifyInstance.decorate('redis', redis);
});

export default redisPlugin;
