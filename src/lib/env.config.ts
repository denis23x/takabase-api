/** @format */

export const envConfig: Record<string, any> = {
  confKey: 'config',
  schema: {
    type: 'object',
    required: ['MYSQL_DATABASE_URL'],
    properties: {
      NODE_ENV: {
        type: 'string',
        default: 'development'
      },
      APP_PORT: {
        type: 'number',
        default: 5000
      },
      APP_HOST: {
        type: 'string',
        default: '127.0.0.1'
      },
      APP_PRISMA_LOG: {
        type: 'string',
        default: 'debug'
      },
      ENABLE_SWAGGER: {
        type: 'boolean',
        default: true
      },
      MYSQL_DATABASE: {
        type: 'string',
        default: 'dbname'
      },
      MYSQL_USER: {
        type: 'string',
        default: 'username'
      },
      MYSQL_PASSWORD: {
        type: 'string',
        default: 'password'
      },
      MYSQL_HOST: {
        type: 'string',
        default: 'app-mysql'
      },
      MYSQL_DATABASE_URL: {
        type: 'string'
      }
    }
  },
  dotenv: true
};
