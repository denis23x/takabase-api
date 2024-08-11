/** @format */

import { config } from 'dotenv';
import type { RedisConfigNodejs } from '@upstash/redis';

config({
  path: '.env.takabase-local',
  override: false
});

// https://github.com/redis/ioredis

export const redisConfig: RedisConfigNodejs = {
  url: String(process.env.API_REDIS_URL),
  token: String(process.env.API_REDIS_TOKEN)
};
