/** @format */

import { config } from 'dotenv';
import dayjs from 'dayjs';
import type { PinoLoggerOptions } from 'fastify/types/logger';
import type { FastifyReply, FastifyRequest } from 'fastify';

config({
  path: '.env.takabase-local',
  override: false
});

const loggerConfigBase: PinoLoggerOptions = {
  base: null,
  timestamp: (): string => {
    const date: string = dayjs().toISOString();

    return `,"time":"${date}"`;
  },
  redact: [
    'request.headers.authorization',
    'request.headers.cookie',
    'request.body.email',
    'request.body.password',
    'request.body.newPassword',
    'request.body.newEmail',
    'response.headers',
    'response.cookie'
  ],
  serializers: {
    res(reply: FastifyReply): any {
      return {
        statusCode: reply.statusCode
      };
    },
    req: (request: FastifyRequest): any => {
      return {
        method: request.method,
        url: request.url
      };
    }
  }
};

const loggerConfigList: Record<string, PinoLoggerOptions | boolean> = {
  localhost: {
    level: 'debug',
    ...loggerConfigBase,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        colorizeObjects: true
      }
    }
  },
  development: {
    level: 'info',
    ...loggerConfigBase
  },
  production: {
    level: 'warn',
    ...loggerConfigBase
  }
};

export const loggerConfig: PinoLoggerOptions | boolean = loggerConfigList[String(process.env.APP_NODE_ENV)];
