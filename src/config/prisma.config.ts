/** @format */

import { Prisma } from '../database/client';

// https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging

const prismaConfigList: Record<string, Prisma.PrismaClientOptions> = {
  development: {
    errorFormat: 'pretty',
    log: ['warn', 'error']
  },
  production: {
    errorFormat: 'minimal'
  }
};

export const prismaConfig: Prisma.PrismaClientOptions = prismaConfigList[String(process.env.NODE_ENV)];
