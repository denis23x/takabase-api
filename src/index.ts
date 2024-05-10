/** @format */

import { main } from './main';
import { FastifyInstance } from 'fastify';
import { FastifyListenOptions } from 'fastify/types/instance';
import { HttpsFunction, onRequest, Request, HttpsOptions } from 'firebase-functions/v2/https';
import * as express from 'express';

/** FASTIFY */

const exitHandler = (app: FastifyInstance, exitCode: number): void => {
  app.close(() => {
    app.log.info('Server closed');

    process.exit(exitCode);
  });
};

main()
  .then((fastifyInstance: FastifyInstance) => {
    // GRACEFUL SHUTDOWN

    ['SIGINT', 'SIGTERM'].forEach((signal: string): void => {
      process.on(signal, () => {
        fastifyInstance.log.info('Attempting to gracefully shutdown the app');

        exitHandler(fastifyInstance, 0);
      });
    });

    // UNEXPECTED SHUTDOWN

    ['uncaughtException', 'unhandledRejection'].forEach((signal: string): void => {
      process.on(signal, (error: any) => {
        fastifyInstance.log.error(error);

        exitHandler(fastifyInstance, 1);
      });
    });

    // DOCKER
    const options: FastifyListenOptions = {
      port: process.env.APP_PORT ? Number(process.env.APP_PORT) : 4400,
      host: process.env.APP_HOST ? String(process.env.APP_HOST) : 'localhost'
    };

    // PROCESS

    fastifyInstance
      .listen(options)
      .then(() => fastifyInstance.log.info('Ready, Waiting for connections...'))
      .catch((error: any) => fastifyInstance.log.error(error));
  })
  .catch((error: any) => {
    console.error(error);

    // BOOTSTRAP FAILED

    process.exit(1);
  });

/** FIREBASE */

// prettier-ignore
export const apiHttpsOptions: HttpsOptions = {
  region: 'us-central1',
  minInstances: 0,
  maxInstances: 4,
  memory: '512MiB',
  secrets: [
    'APP_NODE_ENV',
    'APP_SERVICE_ACCOUNT',
    'API_JWT_SECRET',
    'API_JWT_TTL',
    'API_MYSQL_DATABASE_URL'
  ]
};

export const api: HttpsFunction = onRequest(apiHttpsOptions, async (request: Request, response: express.Response) => {
  const fastifyInstance: FastifyInstance = await main();

  await fastifyInstance.ready();

  fastifyInstance.server.emit('request', request, response);
});
