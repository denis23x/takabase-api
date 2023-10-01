/** @format */

import { PinoLoggerOptions } from 'fastify/types/logger';

const environmentConfigs: Record<string, PinoLoggerOptions | boolean> = {
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

const getConfig = (): PinoLoggerOptions | boolean => {
  const env: string = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'development':
      return environmentConfigs.development;
    case 'production':
      return environmentConfigs.production;
    default:
      return false;
  }
};

export const loggerConfig: PinoLoggerOptions | boolean = getConfig();
