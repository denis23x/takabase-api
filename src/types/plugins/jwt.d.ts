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
      firebaseId: string;
    };
    user: {
      id: number;
      firebaseId: string;
    };
  }
}

export {};
