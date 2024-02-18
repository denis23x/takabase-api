/** @format */

import { Prisma } from '../database/client';
import * as dotenv from 'dotenv';

dotenv.config();

// https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging

const prismaConfigList: Record<string, Prisma.PrismaClientOptions> = {
  localhost: {
    errorFormat: 'pretty',
    log: ['warn', 'error']
  },
  development: {
    errorFormat: 'pretty',
    log: ['warn', 'error']
  },
  production: {
    errorFormat: 'minimal'
  }
};

export const prismaConfig: Prisma.PrismaClientOptions = prismaConfigList[String(process.env.NODE_ENV)];
