/** @format */

import { main } from './main';
import { gracefullyShutdown, unexpectedErrorHandler } from './lib/exit-handler';
import { FastifyInstance } from 'fastify';
import { FastifyListenOptions } from 'fastify/types/instance';

// npx autocannon -c 1000 -d 5 -p 10 "http://127.0.0.1:5000/api/v1/categories?size=10&page=1"

main()
  .then((fastifyInstance: FastifyInstance) => {
    // GRACEFUL SHUTDOWN

    process.on('uncaughtException', (error: any) => unexpectedErrorHandler(fastifyInstance, error));
    process.on('unhandledRejection', (error: any) => unexpectedErrorHandler(fastifyInstance, error));
    process.on('SIGTERM', () => gracefullyShutdown(fastifyInstance));
    process.on('SIGINT', () => gracefullyShutdown(fastifyInstance));

    const options: FastifyListenOptions = {
      port: Number(fastifyInstance.config.APP_PORT),
      host: fastifyInstance.config.APP_HOST
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
