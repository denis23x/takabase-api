/** @format */

import fp from 'fastify-plugin';
import { Redis } from '@upstash/redis';
import { redisConfig } from '../config/redis.config';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

//! Singleton

let redis: Redis = null;

const redisPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  if (!redis) {
    redis = new Redis(redisConfig);
  }

  //!Set instance

  fastifyInstance.decorate('redis', redis);
});

export default redisPlugin;
