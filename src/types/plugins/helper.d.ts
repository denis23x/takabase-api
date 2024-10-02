/** @format */

import type { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    helperPlugin: {
      throwError: (message: string, error: any, request: FastifyRequest) => any;
      camelCaseToDashCase: (value: string) => string;
      mapObjectValuesToNull: (mapObject: any) => any;
      generateUid: (length: number) => string;
      getRelativeUrl: (urlList: string[]) => string[];
    };
  }
}

export {};
