/** @format */

import { PrismaClient } from '@prisma/client';
import { Prisma } from '../database/client';
import { FastifyReply } from 'fastify';
import { ResponseError } from '../crud/response/response-error.schema';

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
      setError: (reply: FastifyReply, error: Prisma.PrismaClientKnownRequestError) => FastifyReply | null;
    };
  }
}

export {};
