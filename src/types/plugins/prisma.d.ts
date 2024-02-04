/** @format */

import { PrismaClient } from '@prisma/client';
import { Prisma } from '../database/client';
import { FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    prismaService: {
      getCategorySelect: () => Prisma.CategorySelect;
      getPostSelect: () => Prisma.PostSelect;
      getUserSelect: () => Prisma.UserSelect;
      setScope: (anyManyArgs: any, scope: string[]) => any;
      setOrderBy: (anyManyArgs: any, orderBy: string) => any;
      setError: (reply: FastifyReply, error: Prisma.PrismaClientKnownRequestError) => FastifyReply;
    };
  }
}

export {};
