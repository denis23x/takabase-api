/** @format */

import { Prisma } from '../database/client';
import * as dotenv from 'dotenv';

dotenv.config();

// https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging

const prismaConfigList: Record<string, Prisma.PrismaClientOptions> = {
  localhost: {
    errorFormat: 'pretty',
    log: ['warn', 'error'],
    transactionOptions: {
      maxWait: 2000,
      timeout: 5000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  },
  development: {
    errorFormat: 'pretty',
    log: ['warn', 'error'],
    transactionOptions: {
      maxWait: 2000,
      timeout: 5000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  },
  production: {
    errorFormat: 'minimal',
    transactionOptions: {
      maxWait: 2000,
      timeout: 5000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  }
};

export const prismaConfig: Prisma.PrismaClientOptions = prismaConfigList[String(process.env.NODE_ENV)];
