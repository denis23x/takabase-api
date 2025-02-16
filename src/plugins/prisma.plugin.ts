/** @format */

import fp from 'fastify-plugin';
import { prismaConfig } from '../config/prisma.config';
import { Prisma, PrismaClient } from '../database/client';
import { DatabaseError } from '@tidbcloud/serverless';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { ResponseError } from '../types/crud/response/response-error.schema';

//! Singleton

let prismaClient: PrismaClient = null;

const prismaPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  if (!prismaClient) {
    prismaClient = new PrismaClient(prismaConfig);
  }

  //! Set instance

  fastifyInstance.decorate('prisma', prismaClient);

  fastifyInstance.decorate('prismaPlugin', {
    getCategorySelect: (): Prisma.CategorySelect => ({
      id: true,
      name: true,
      description: true,
      userFirebaseUid: false,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getPostSelect: (): Prisma.PostSelect => ({
      id: true,
      name: true,
      userFirebaseUid: false,
      description: true,
      markdown: false,
      cover: true,
      categoryId: false,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getPostPasswordSelect: (): Prisma.PostPasswordSelect => ({
      id: true,
      name: true,
      userFirebaseUid: false,
      description: true,
      markdown: false,
      cover: true,
      password: false,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getPostPrivateSelect: (): Prisma.PostPrivateSelect => ({
      id: true,
      name: true,
      userFirebaseUid: false,
      description: true,
      markdown: false,
      cover: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getUserSelect: (): Prisma.UserSelect => ({
      id: true,
      firebaseUid: false,
      name: true,
      description: false,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getInsightsSelect: (): Prisma.InsightsSelect => ({
      id: true,
      categories: true,
      posts: true,
      users: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getErrorPrisma: (error: Prisma.PrismaClientKnownRequestError): ResponseError | null => {
      const prismaErrorReference: string = 'https://prisma.io/docs/reference/api-reference/error-reference';
      const prismaErrorMessage: string = [prismaErrorReference, error.code?.toLowerCase()].join('#');

      switch (error.code) {
        case 'P2034': {
          //! Transaction write conflict or deadlock (no reply, should retry)

          return null;
        }
        case 'P2028': {
          //! Transaction timeout (no reply, should retry)

          return null;
        }
        case 'P2025': {
          return {
            error: 'Not found',
            message: prismaErrorMessage,
            statusCode: 404
          };
        }
        case 'P2002': {
          return {
            error: 'Bad Request',
            message: prismaErrorMessage,
            statusCode: 400
          };
        }
        default: {
          return {
            error: 'Internal Server Error',
            message: 'Prisma Error',
            statusCode: 500
          };
        }
      }
    },
    getErrorDatabase: (error: DatabaseError): ResponseError => {
      const message: string = error.details.message.toLowerCase();

      switch (true) {
        case message.includes('duplicate'): {
          switch (true) {
            case message.includes('user.user'): {
              return {
                code: error.details.code,
                message: 'Username is already in use',
                error: 'Bad request',
                statusCode: 400
              };
            }
            case message.includes('category.category'): {
              return {
                code: error.details.code,
                message: 'Category name is already in use',
                error: 'Bad request',
                statusCode: 400
              };
            }
            case message.includes('postpassword.postpassword'):
            case message.includes('postprivate.postprivate'):
            case message.includes('post.post'): {
              return {
                code: error.details.code,
                message: 'Post name is already in use',
                error: 'Bad request',
                statusCode: 400
              };
            }
            default: {
              return {
                error: 'Internal Server Error',
                message: 'Database Error',
                statusCode: 500
              };
            }
          }
        }
        default: {
          return {
            error: 'Internal Server Error',
            message: 'Database Error',
            statusCode: 500
          };
        }
      }
    },
    setErrorTransaction: async (error: any, retriesLimit: boolean, rollback: any): Promise<ResponseError | null> => {
      const rollbackList: Promise<any>[] = Object.values(rollback).map(async (cb: any): Promise<any> => cb());

      // TODO: Handle rejected ..
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const rollbackResult: PromiseSettledResult<any>[] = await Promise.allSettled(rollbackList);

      /** ERRORS */

      if (retriesLimit) {
        return {
          message: 'Something unexpected occurred. Please try again later',
          error: 'Internal Server Error',
          statusCode: 500
        };
      }

      /** ERRORS DETAILS */

      switch (true) {
        case error instanceof Prisma.PrismaClientKnownRequestError: {
          return fastifyInstance.prismaPlugin.getErrorPrisma(error);
        }
        case error instanceof DatabaseError: {
          return fastifyInstance.prismaPlugin.getErrorDatabase(error);
        }
        default: {
          return {
            code: error.message,
            message: 'Fastify application error',
            error: 'Internal Server Error',
            statusCode: 500
          };
        }
      }
    }
  });

  //! Shutdown

  fastifyInstance.addHook('onClose', async (fastifyInstance: FastifyInstance): Promise<void> => {
    await fastifyInstance.prisma.$disconnect();
  });
});

export default prismaPlugin;
