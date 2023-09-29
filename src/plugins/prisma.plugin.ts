/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Prisma, PrismaClient } from '../database/client';
import * as process from 'process';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    prismaService: any;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async function prismaPlugin(fastifyInstance: FastifyInstance) {
  const options: Prisma.PrismaClientOptions = {
    errorFormat: 'minimal'
  };

  /** https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging */

  if (process.env.APP_PRISMA_LOG === 'debug') {
    options.errorFormat = 'pretty';
    options.log = ['query', 'info', 'warn', 'error'];
  }

  const prisma: PrismaClient = new PrismaClient(options);

  fastifyInstance.decorate('prisma', prisma);
  fastifyInstance.decorate('prismaService', {
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

  fastifyInstance.addHook('onClose', async (instance: FastifyInstance) => {
    await instance.prisma.$disconnect();
  });
});

export default prismaPlugin;
