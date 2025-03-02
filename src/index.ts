/** @format */

import { main } from './main';
import { onRequest } from 'firebase-functions/v2/https';
import type { FastifyInstance } from 'fastify';
import type { FastifyListenOptions } from 'fastify/types/instance';
import type { HttpsFunction, Request, HttpsOptions } from 'firebase-functions/v2/https';
import type { Response } from 'express';

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
      port: 4400,
      host: 'localhost',
      listenTextResolver: () => ''
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

export const apiHttpsOptions: HttpsOptions = {
  region: 'us-central1',
  minInstances: 0,
  maxInstances: 4,
  memory: '512MiB',
  secrets: [
    'APP_NODE_ENV',
    'APP_SERVICE_ACCOUNT',
    'API_DATABASE_URL',
    'API_DATABASE_DIRECT_URL',
    'API_ALGOLIA_APP_ID',
    'API_ALGOLIA_API_KEY',
    'API_LAVINMQ_URL'
  ]
};

export const api: HttpsFunction = onRequest(apiHttpsOptions, async (request: Request, response: Response) => {
  const fastifyInstance: FastifyInstance = await main();

  await fastifyInstance.ready();

  fastifyInstance.server.emit('request', request, response);
});
