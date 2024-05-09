/** @format */

import { FastifyJWTOptions } from '@fastify/jwt';
import { config } from 'dotenv';

config({
  path: '.env.takabase-local',
  override: false
});

// https://github.com/fastify/fastify-jwt

const jwtConfigList: Record<string, FastifyJWTOptions> = {
  localhost: {
    secret: 'secret',
    sign: {
      expiresIn: '1339200000ms'
    }
  },
  development: {
    secret: 'secret',
    sign: {
      expiresIn: '2678400000ms'
    }
  },
  production: {
    secret: String(process.env.API_JWT_SECRET),
    sign: {
      expiresIn: String(process.env.API_JWT_TTL) + 'ms'
    }
  }
};

export const jwtConfig: FastifyJWTOptions = jwtConfigList[String(process.env.APP_NODE_ENV)];
