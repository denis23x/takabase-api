/** @format */

import { FastifyJWTOptions } from '@fastify/jwt';

// https://github.com/fastify/fastify-jwt

export const jwtConfig: FastifyJWTOptions = {
  secret: String(process.env.JWT_SECRET),
  cookie: {
    cookieName: 'jwt-token',
    signed: true
  },
  sign: {
    expiresIn: String(process.env.JWT_TTL) + 'ms'
  }
};
