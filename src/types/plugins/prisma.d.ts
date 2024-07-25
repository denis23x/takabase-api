/** @format */

import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '../database/client';
import type { ResponseError } from '../crud/response/response-error.schema';
import type { DatabaseError } from '@tidbcloud/serverless';

// prettier-ignore
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    prismaPlugin: {
      getCategorySelect: () => Prisma.CategorySelect;
      getPostSelect: () => Prisma.PostSelect;
      getPostPasswordSelect: () => Prisma.PostPasswordSelect;
      getPostPrivateSelect: () => Prisma.PostPrivateSelect;
      getUserSelect: () => Prisma.UserSelect;
      setScope: (anyManyArgs: any, scope: string[]) => any;
      getErrorPrisma: (error: Prisma.PrismaClientKnownRequestError) => ResponseError | null;
      getErrorDatabase: (error: DatabaseError) => ResponseError;
      setErrorTransaction: (error: any, retriesLimitReached: boolean, requestRollback: any) => Promise<ResponseError | null>;
    };
  }
}

export {};
