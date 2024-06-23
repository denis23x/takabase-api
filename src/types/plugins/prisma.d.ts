/** @format */

import { PrismaClient } from '@prisma/client';
import { Prisma } from '../database/client';
import { ResponseError } from '../crud/response/response-error.schema';
import { DatabaseError } from '@tidbcloud/serverless';

// prettier-ignore
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    prismaPlugin: {
      getCategorySelect: () => Prisma.CategorySelect;
      getPostSelect: () => Prisma.PostSelect;
      getUserSelect: () => Prisma.UserSelect;
      setScope: (anyManyArgs: any, scope: string[]) => any;
      getErrorPrisma: (error: Prisma.PrismaClientKnownRequestError) => ResponseError | null;
      getErrorDatabase: (error: DatabaseError) => ResponseError;
      setErrorTransaction: (error: any, retriesLimitReached: boolean, requestRollback: any) => Promise<ResponseError | null>;
    };
  }
}

export {};
