/** @format */

import { config } from 'dotenv';
import type { RedisConfigNodejs } from '@upstash/redis';

config({
  path: '.env.takabase-local',
  override: false
});

// https://github.com/redis/ioredis

export const redisConfig: RedisConfigNodejs = {
  url: 'https://major-kodiak-58739.upstash.io',
  token: 'AeVzAAIjcDE0ODYxM2FkMzNlZDY0MDBmOTVkYTFhMzc5N2JjZTdlZnAxMA'
};
