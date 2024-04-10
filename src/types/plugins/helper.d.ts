/** @format */

import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    helperPlugin: {
      throwError: (message: string, error: any, request: FastifyRequest) => any;
    };
  }
}

export {};
