/** @format */

import type { Redis } from '@upstash/redis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export {};
