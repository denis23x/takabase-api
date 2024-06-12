/** @format */

import { Auth } from 'firebase-admin/auth';
import { DecodedIdToken } from 'firebase-admin/lib/auth';

declare module 'fastify' {
  interface FastifyInstance {
    auth: Auth;
    verifyIdToken: any;
    verifyAdmin: any;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: DecodedIdToken | null;
  }
}

export {};
