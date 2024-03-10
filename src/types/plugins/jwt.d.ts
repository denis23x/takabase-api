/** @format */

import { User } from '../database/client';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
    authenticateHandler: {
      signUser: (user: User) => string;
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: number;
      firebaseUid: string;
    };
    user: {
      id: number;
      firebaseUid: string;
    };
  }
}

export {};
