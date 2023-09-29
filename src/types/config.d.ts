/** @format */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      NODE_ENV: 'development' | 'production';
      APP_PORT: number;
      APP_HOST: string;
      APP_PRISMA_LOG: string;
      ENABLE_SWAGGER: boolean;
      MYSQL_DATABASE: boolean;
      MYSQL_USER: boolean;
      MYSQL_PASSWORD: boolean;
      MYSQL_HOST: boolean;
      MYSQL_DATABASE_URL: boolean;
    };
  }
}
