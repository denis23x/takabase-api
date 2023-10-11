/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { Prisma, PrismaClient } from '../database/client';
import { prismaConfig } from '../config/prisma.config';

const prismaPlugin: FastifyPluginAsync = fp(async function prismaPlugin(fastifyInstance: FastifyInstance) {
  const prisma: PrismaClient = new PrismaClient(prismaConfig);

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
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getResponseError: (reply: FastifyReply, error: Prisma.PrismaClientKnownRequestError): FastifyReply => {
      const prismaErrorReference: string = 'https://prisma.io/docs/reference/api-reference/error-reference';
      const prismaErrorMessage: string = [prismaErrorReference, error.code?.toLowerCase()].join('#');

      switch (error.code) {
        case 'P2025': {
          return reply.status(404).send({
            error: 'Not found',
            message: prismaErrorMessage,
            statusCode: 404
          });
        }
        case 'P2002': {
          return reply.status(400).send({
            error: 'Bad Request',
            message: prismaErrorMessage,
            statusCode: 400
          });
        }
        default: {
          return reply.status(500).send({
            error: 'Internal Server Error',
            message: prismaErrorMessage,
            statusCode: 500
          });
        }
      }
    }
  });

  fastifyInstance.addHook('onClose', async (instance: FastifyInstance): Promise<void> => {
    await instance.prisma.$disconnect();
  });
});

export default prismaPlugin;
