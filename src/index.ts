/** @format */

import { main } from './main';
import { FastifyInstance } from 'fastify';
import { FastifyListenOptions } from 'fastify/types/instance';

const exitHandler = (app: FastifyInstance, exitCode: number): void => {
  app.close(() => {
    app.log.info('Server closed');

    process.exit(exitCode);
  });
};

// npx autocannon -c 1000 -d 5 -p 10 "http://127.0.0.1:5000/api/v1/categories?size=10&page=1"

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
