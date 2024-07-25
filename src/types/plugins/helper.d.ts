/** @format */

import type { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    helperPlugin: {
      throwError: (message: string, error: any, request: FastifyRequest) => any;
      mapObjectValuesToNull: (mapObject: any) => any;
    };
  }
}

export {};
