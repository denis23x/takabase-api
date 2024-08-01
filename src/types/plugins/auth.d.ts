/** @format */

import type { Auth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/lib/auth';

declare module 'fastify' {
  interface FastifyInstance {
    auth: Auth;
    verifyIdToken: any;
    verifyIdTokenOptional: any;
    verifyAdmin: any;
    verifyUsername: any;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: DecodedIdToken | null;
  }
}

export {};
