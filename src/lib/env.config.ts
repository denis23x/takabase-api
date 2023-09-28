/** @format */

const Config = {
  confKey: 'config',
  schema: {
    type: 'object',
    required: ['MYSQL_DATABASE_URL'],
    properties: {
      PROJECT_NAME: {
        type: 'string',
        default: 'fastify-rest'
      },
      NODE_ENV: {
        type: 'string',
        default: 'development'
      },
      BIND_PORT: {
        type: 'number',
        default: 5000
      },
      BIND_ADDR: {
        type: 'string',
        default: '127.0.0.1'
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

export default Config;
