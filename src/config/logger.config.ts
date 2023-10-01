/** @format */

import { PinoLoggerOptions } from 'fastify/types/logger';

const configList: Record<string, PinoLoggerOptions | boolean> = {
  development: {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        ignore: 'pid,hostname',
        colorize: true,
        colorizeObjects: true
      }
    }
  },
  production: true
};

export const loggerConfig: PinoLoggerOptions | boolean = configList[String(process.env.NODE_ENV)];
