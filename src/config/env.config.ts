/** @format */

import { FastifyEnvOptions } from '@fastify/env';

// https://github.com/fastify/fastify-env

export const envConfig: FastifyEnvOptions = {
  confKey: 'config',
  schema: {
    type: 'object',
    required: ['MYSQL_DATABASE_URL'],
    properties: {
      NODE_ENV: {
        type: 'string',
        default: 'development'
      },
      APP_PORT: {
        type: 'number',
        default: 5000
      },
      APP_HOST: {
        type: 'string',
        default: 'localhost'
      },
      APP_STORAGE: {
        type: 'string',
        default: 'disk'
      },
      JWT_SECRET: {
        type: 'string',
        default: 'secret'
      },
      JWT_TTL: {
        type: 'number',
        default: 2678400000
      },
      COOKIE_SECRET: {
        type: 'string',
        default: 'secret'
      },
      COOKIE_DOMAIN: {
        type: 'string',
        default: 'localhost'
      },
      ENABLE_SWAGGER: {
        type: 'boolean',
        default: false
      },
      MYSQL_DATABASE: {
        type: 'string',
        default: 'dbname'
      },
      MYSQL_ROOT_PASSWORD: {
        type: 'string',
        default: 'root'
      },
      MYSQL_USER: {
        type: 'string',
        default: 'username'
      },
      MYSQL_PASSWORD: {
        type: 'string',
        default: 'password'
      },
      MYSQL_HOST: {
        type: 'string',
        default: 'app-mysql'
      },
      MYSQL_DATABASE_URL: {
        type: 'string'
      }
    }
  },
  dotenv: true
};
