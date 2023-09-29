/** @format */

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Prisma, PrismaClient } from '../database/client';

// Use TypeScript module augmentation to declare the type of server.prisma to be PrismaClient
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    prismaService: any;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async function prismaPlugin(server) {
  const prisma: PrismaClient = new PrismaClient({
    errorFormat: 'pretty'
  });

  /** https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging */

  // if (configService.get('APP_LOG') === 'debug') {
  //   prismaClientOptions.errorFormat = 'pretty';
  //   prismaClientOptions.log = ['query', 'info', 'warn', 'error'];
  // }

  // await prisma.$connect();

  // Make Prisma Client available through the fastify server instance: server.prisma
  server.decorate('prisma', prisma);

  // Make Prisma Client available through the fastify server instance: server.prisma
  server.decorate('prismaService', {
    getCategorySelect: (): Prisma.CategorySelect => ({
      id: true,
      name: true,
      description: true,
      userId: false,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getPostSelect: (): Prisma.PostSelect => ({
      id: true,
      name: true,
      description: true,
      markdown: false,
      image: true,
      userId: false,
      categoryId: false,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getUserSelect: (): Prisma.UserSelect => ({
      id: true,
      facebookId: false,
      githubId: false,
      googleId: false,
      name: true,
      description: true,
      avatar: true,
      email: false,
      emailConfirmed: false,
      password: false,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    })
  });

  server.addHook('onClose', async instance => {
    await instance.prisma.$disconnect();
  });
});

export default prismaPlugin;
