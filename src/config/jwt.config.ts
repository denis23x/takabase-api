/** @format */

import { FastifyJWTOptions } from '@fastify/jwt';
import * as dotenv from 'dotenv';

dotenv.config();

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
    secret: String(process.env.JWT_SECRET),
    sign: {
      expiresIn: String(process.env.JWT_TTL) + 'ms'
    }
  }
};

export const jwtConfig: FastifyJWTOptions = jwtConfigList[String(process.env.NODE_ENV)];
