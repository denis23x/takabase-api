/** @format */

import { PrismaClient } from '@prisma/client';
import { Prisma } from '../database/client';
import { FastifyReply } from 'fastify';
import { ResponseError } from '../crud/response/response-error.schema';

// prettier-ignore
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    prismaService: {
      getCategorySelect: () => Prisma.CategorySelect;
      getPostSelect: () => Prisma.PostSelect;
      getUserSelect: () => Prisma.UserSelect;
      setScope: (anyManyArgs: any, scope: string[]) => any;
      setOrderBy: (anyManyArgs: any, orderBy: string) => any;
      getError: (error: Prisma.PrismaClientKnownRequestError) => ResponseError | null;
      getErrorTransaction: (error: any, retriesLimitReached: boolean) => ResponseError | null;
      setErrorTransaction: (error: any, retriesLimitReached: boolean, requestRollback: any) => Promise<ResponseError | null>;
      setError: (reply: FastifyReply, error: Prisma.PrismaClientKnownRequestError) => FastifyReply | null;
    };
  }
}

export {};
