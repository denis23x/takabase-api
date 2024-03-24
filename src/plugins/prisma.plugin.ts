/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { Prisma, PrismaClient } from '../database/client';
import { prismaConfig } from '../config/prisma.config';
import { ResponseError } from '../types/crud/response/response-error.schema';

const prismaPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('prisma', new PrismaClient(prismaConfig));

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
      firebaseUid: true,
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
      firebaseUid: true,
      name: true,
      description: true,
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
                select: fastifyInstance.prismaService.getCategorySelect()
              }
            };
          }
          case 'categories': {
            return {
              categories: {
                select: fastifyInstance.prismaService.getCategorySelect(),
                orderBy: {
                  id: 'desc'
                }
              }
            };
          }
          case 'posts': {
            return {
              posts: {
                select: fastifyInstance.prismaService.getPostSelect(),
                orderBy: {
                  id: 'desc'
                }
              }
            };
          }
          case 'user': {
            return {
              user: {
                select: fastifyInstance.prismaService.getUserSelect()
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
    setOrderBy: (anyManyArgs: any, orderBy: string): any => {
      const getOrderBy = (): any => {
        switch (orderBy) {
          case 'newest': {
            return {
              id: 'desc'
            };
          }
          case 'oldest': {
            return {
              id: 'asc'
            };
          }
          default: {
            return undefined;
          }
        }
      };

      const anyManyArgsEntries: any[] = Object.entries({ ...anyManyArgs.orderBy, ...getOrderBy() });
      const anyManyArgsOrderBy: any = anyManyArgsEntries.map(([key, value]: any[]) => ({
        [key]: value
      }));

      return anyManyArgsOrderBy;
    },
    getError: (error: Prisma.PrismaClientKnownRequestError): ResponseError | null => {
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
            message: prismaErrorMessage,
            statusCode: 500
          };
        }
      }
    },
    getErrorTransaction: (error: any, retriesLimitReached: boolean): ResponseError | null => {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (retriesLimitReached) {
          return {
            message: 'Something unexpected occurred. Please try again later',
            error: 'Internal Server Error',
            statusCode: 500
          };
        }

        return fastifyInstance.prismaService.getError(error);
      } else {
        return {
          code: error.message,
          message: 'Fastify application error',
          error: 'Internal Server Error',
          statusCode: 500
        };
      }
    },
    setError: (reply: FastifyReply, error: Prisma.PrismaClientKnownRequestError): FastifyReply => {
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
