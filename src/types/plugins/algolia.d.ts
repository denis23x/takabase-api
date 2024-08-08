/** @format */

import type { SearchClient } from 'algoliasearch/dist/algoliasearch';
import type { FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    algolia: SearchClient;
    algoliaPlugin: {
      getFile: (indexObjects: any, reply: FastifyReply) => FastifyReply;
      setClear: (index: string) => Promise<void>;
      getSync: (index: string, indexObjects: any, reply: FastifyReply) => Promise<FastifyReply>;
    };
  }
}

export {};
