/** @format */

import { Prisma } from '../database/client';
import { config } from 'dotenv';
import { connect, Connection } from '@tidbcloud/serverless';
import { PrismaTiDBCloud } from '@tidbcloud/prisma-adapter';

config({
  path: '.env.takabase-local',
  override: false
});

// https://docs.pingcap.com/tidbcloud/serverless-driver-prisma-example

const connection: Connection = connect({
  url: String(process.env.API_MYSQL_DATABASE_URL),
  debug: false
});

const prismaTiDBCloud: any = new PrismaTiDBCloud(connection);

// https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/logging

const prismaConfigList: Record<string, Prisma.PrismaClientOptions> = {
  localhost: {
    errorFormat: 'pretty',
    log: ['warn', 'error'],
    transactionOptions: {
      maxWait: 2000,
      timeout: 5000
    }
  },
  development: {
    errorFormat: 'pretty',
    log: ['warn', 'error'],
    transactionOptions: {
      maxWait: 2000,
      timeout: 5000
    },
    adapter: prismaTiDBCloud
  },
  production: {
    errorFormat: 'minimal',
    transactionOptions: {
      maxWait: 2000,
      timeout: 5000
    },
    adapter: prismaTiDBCloud
  }
};

export const prismaConfig: Prisma.PrismaClientOptions = prismaConfigList[String(process.env.APP_NODE_ENV)];
