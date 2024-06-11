/** @format */

import { SearchClient } from 'algoliasearch/dist/algoliasearch';

declare module 'fastify' {
  interface FastifyInstance {
    algolia: SearchClient;
  }
}

export {};
