/** @format */

import { PrismaClient } from '@prisma/client';
import { Prisma } from '../database/client';
import { ResponseError } from '../crud/response/response-error.schema';

// prettier-ignore
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    prismaPlugin: {
      getCategorySelect: () => Prisma.CategorySelect;
      getPostSelect: () => Prisma.PostSelect;
      getUserSelect: () => Prisma.UserSelect;
      setScope: (anyManyArgs: any, scope: string[]) => any;
      getError: (error: Prisma.PrismaClientKnownRequestError) => ResponseError | null;
      getErrorTransaction: (error: any, retriesLimitReached: boolean) => ResponseError | null;
      setErrorTransaction: (error: any, retriesLimitReached: boolean, requestRollback: any) => Promise<ResponseError | null>;
    };
  }
}

export {};
