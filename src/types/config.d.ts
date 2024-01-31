/** @format */

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      NODE_ENV: 'development' | 'production';
      APP_PORT: number;
      APP_HOST: string;
      APP_STORAGE: 'disk' | 'bucket';
      JWT_SECRET: string;
      JWT_TTL: number;
      COOKIE_SECRET: string;
      COOKIE_DOMAIN: string;
      ENABLE_SWAGGER: boolean;
      OPENAI_API_KEY: string;
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
