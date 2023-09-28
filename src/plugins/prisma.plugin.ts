/** @format */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '../database/client';

// Use TypeScript module augmentation to declare the type of server.prisma to be PrismaClient
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async function prismaPlugin(server) {
  const prisma: PrismaClient = new PrismaClient();

  // await prisma.$connect();

  // Make Prisma Client available through the fastify server instance: server.prisma
  server.decorate('prisma', prisma);

  server.addHook('onClose', async instance => {
    await instance.prisma.$disconnect();
  });
});

export default prismaPlugin;
