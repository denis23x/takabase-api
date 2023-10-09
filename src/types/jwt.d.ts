/** @format */

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
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
