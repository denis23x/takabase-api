/** @format */

import { main } from './main';
import { gracefullyShutdown, unexpectedErrorHandler } from './lib/exit-handler';
import { FastifyInstance } from 'fastify';
import { FastifyListenOptions } from 'fastify/types/instance';

// npx autocannon -c 1000 -d 5 -p 10 "http://127.0.0.1:5000/api/v1/categories?size=10&page=1"

main()
  .then((app: FastifyInstance) => {
    // GRACEFUL SHUTDOWN

    process.on('uncaughtException', (error: any) => unexpectedErrorHandler(app, error));
    process.on('unhandledRejection', (error: any) => unexpectedErrorHandler(app, error));
    process.on('SIGTERM', () => gracefullyShutdown(app));
    process.on('SIGINT', () => gracefullyShutdown(app));

    const options: FastifyListenOptions = {
      port: Number(process.env.APP_PORT),
      host: process.env.APP_HOST
    };

    // PROCESS

    app
      .listen(options)
      .then(() => app.log.info('Ready, Waiting for connections...'))
      .catch((error: any) => app.log.error(error));
  })
  .catch((error: any) => {
    console.error(error);

    // BOOTSTRAP FAILED

    process.exit(1);
  });
