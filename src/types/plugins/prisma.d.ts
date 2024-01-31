/** @format */

import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    prismaService: any;
  }
}

export {};
