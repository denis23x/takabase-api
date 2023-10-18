/** @format */

import { FastifyCorsOptions } from '@fastify/cors';

// https://github.com/fastify/fastify-cors

export const corsConfigList: Record<string, FastifyCorsOptions> = {
  development: {
    origin: ['http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  production: {
    origin: ['https://draft-ssr.web.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
};

export const corsConfig: FastifyCorsOptions = corsConfigList[String(process.env.NODE_ENV)];
