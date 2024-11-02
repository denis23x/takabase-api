/** @format */

import type { FastifyReply } from 'fastify';
import type { SearchClient } from 'algoliasearch';

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
