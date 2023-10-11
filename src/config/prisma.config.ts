/** @format */

import { Prisma } from '../database/client';

// https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging

const configList: Record<string, Prisma.PrismaClientOptions> = {
  debug: {
    errorFormat: 'pretty',
    log: ['warn', 'error']
  },
  minimal: {
    errorFormat: 'minimal'
  }
};

export const prismaConfig: Prisma.PrismaClientOptions = configList[String(process.env.APP_PRISMA_LOG)];
