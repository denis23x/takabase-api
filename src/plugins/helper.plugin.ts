/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';

const helperPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('helperPlugin', {
    throwError: (message: string, error: any, request: FastifyRequest): any => {
      // TODO: Cloud logging https://firebase.google.com/docs/functions/writing-and-viewing-logs?gen=2nd#charts_and_alerts

      // Log the error with a custom message
      request.log.error(error, message);

      // Throw a new error with the original error and message
      throw new Error(message, error);
    }
  });
});

export default helperPlugin;
