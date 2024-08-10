/** @format */

import type { AppCheck } from 'firebase-admin/app-check';

declare module 'fastify' {
  interface FastifyInstance {
    appCheck: AppCheck;
  }
}

export {};
