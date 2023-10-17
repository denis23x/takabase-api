/** @format */

import { FastifyCorsOptions } from '@fastify/cors';

// https://github.com/fastify/fastify-cors

export const corsConfig: FastifyCorsOptions = {
  origin: ['http://localhost:4200', 'https://draft-ssr.web.app', 'http://192.168.1.4:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
