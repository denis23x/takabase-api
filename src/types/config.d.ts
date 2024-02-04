/** @format */

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      NODE_ENV: 'development' | 'production';
      APP_PORT: number;
      APP_HOST: string;
      JWT_SECRET: string;
      JWT_TTL: number;
      ENABLE_SWAGGER: boolean;
      MYSQL_ROOT_PASSWORD: string;
      MYSQL_DATABASE: string;
      MYSQL_USER: string;
      MYSQL_PASSWORD: string;
      MYSQL_HOST: string;
      MYSQL_DATABASE_URL: string;
    };
  }
}

export {};
