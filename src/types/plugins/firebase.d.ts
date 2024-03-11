/** @format */

import { App } from 'firebase-admin/app';

declare module 'fastify' {
  interface FastifyInstance {
    firebase: {
      getApp: () => App;
    };
  }
}

export {};
