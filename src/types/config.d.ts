/** @format */

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      NODE_ENV: 'development' | 'production';
      APP_PORT: number;
      APP_HOST: string;
      APP_PRISMA_LOG: string;
      JWT_SECRET: string;
      COOKIE_NAME: string;
      COOKIE_SECRET: string;
      ENABLE_SWAGGER: boolean;
      MYSQL_DATABASE: boolean;
      MYSQL_USER: boolean;
      MYSQL_PASSWORD: boolean;
      MYSQL_HOST: boolean;
      MYSQL_DATABASE_URL: boolean;
    };
  }
}

export {};
