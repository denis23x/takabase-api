/** @format */

import { FastifyCorsOptions } from '@fastify/cors';

// https://github.com/fastify/fastify-cors

export const corsConfig: FastifyCorsOptions = {
  origin: ['http://localhost:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
