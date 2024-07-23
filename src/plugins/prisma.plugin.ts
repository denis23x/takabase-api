/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Prisma, PrismaClient } from '../database/client';
import { prismaConfig } from '../config/prisma.config';
import { ResponseError } from '../types/crud/response/response-error.schema';
import { DatabaseError } from '@tidbcloud/serverless';

const prismaPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('prisma', new PrismaClient(prismaConfig));

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
      firebaseUid: false,
      userFirebaseUid: false,
      description: true,
      markdown: false,
      image: true,
      categoryId: false,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getPostPasswordSelect: (): Prisma.PostPasswordSelect => ({
      id: true,
      name: true,
      firebaseUid: false,
      userFirebaseUid: false,
      description: true,
      markdown: false,
      image: true,
      password: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: false
    }),
    getPostPrivateSelect: (): Prisma.PostPrivateSelect => ({
      id: true,
      name: true,
      firebaseUid: false,
      userFirebaseUid: false,
      description: true,
      markdown: false,
      image: true,
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
    setScope: (anyManyArgs: any, scope: string[]): any => {
      const getSelect = (value: string): any => {
        switch (value) {
          case 'category': {
            return {
              category: {
                select: fastifyInstance.prismaPlugin.getCategorySelect()
              }
            };
          }
          case 'categories': {
            return {
              categories: {
                select: fastifyInstance.prismaPlugin.getCategorySelect(),
                orderBy: {
                  id: 'desc'
                }
              }
            };
          }
          case 'posts': {
            return {
              posts: {
                select: fastifyInstance.prismaPlugin.getPostSelect(),
                orderBy: {
                  id: 'desc'
                }
              }
            };
          }
          case 'user': {
            return {
              user: {
                select: fastifyInstance.prismaPlugin.getUserSelect()
              }
            };
          }
          default: {
            return undefined;
          }
        }
      };

      let anyManyArgsSelect: any = {
        ...anyManyArgs.select
      };

      scope.forEach((value: string) => {
        anyManyArgsSelect = {
          ...anyManyArgsSelect,
          ...getSelect(value)
        };
      });

      return anyManyArgsSelect;
    },
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

  fastifyInstance.addHook('onClose', async (instance: FastifyInstance): Promise<void> => {
    await instance.prisma.$disconnect();
  });
});

export default prismaPlugin;
