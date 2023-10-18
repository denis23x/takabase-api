/** @format */

import { FastifyJWTOptions } from '@fastify/jwt';

// https://github.com/fastify/fastify-jwt

export const jwtConfigList: Record<string, FastifyJWTOptions> = {
  development: {
    secret: 'secret',
    sign: {
      expiresIn: '2678400000ms'
    }
  },
  production: {
    secret: String(process.env.JWT_SECRET),
    sign: {
      expiresIn: String(process.env.JWT_TTL) + 'ms'
    }
  }
};

export const jwtConfig: FastifyJWTOptions = jwtConfigList[String(process.env.NODE_ENV)];
