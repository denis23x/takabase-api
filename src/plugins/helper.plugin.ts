/** @format */

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const helperPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('helperPlugin', {
    throwError: (message: string, error: any): any => {
      // TODO: Cloud logging https://firebase.google.com/docs/functions/writing-and-viewing-logs?gen=2nd#charts_and_alerts

      // Log the error with a custom message
      fastifyInstance.log.error(error, message);

      // Throw a new error with the original error and message
      throw new Error(message, error);
    },
    camelCaseToDashCase: (value: string): string => {
      return value.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    },
    mapObjectValuesToNull: (mapObject: any): any => {
      return Object.entries(mapObject).reduce((accumulator: any, [key, value]: any) => {
        accumulator[key] = value === '' ? null : value;

        return accumulator;
      }, {});
    },
    generateUid: (length: number): string => {
      const alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

      let uid: string = '';

      for (let i = 0; i < length; i++) {
        uid += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
      }

      return uid;
    },
    getRelativeUrl: (urlList: string[]): string[] => {
      return urlList
        .map((url: string) => new URL(url))
        .map((url: URL) => (url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname));
    }
  });
});

export default helperPlugin;
