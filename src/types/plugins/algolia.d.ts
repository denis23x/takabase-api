/** @format */

import { SearchClient } from 'algoliasearch/dist/algoliasearch';
import { FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    algolia: SearchClient;
    algoliaPlugin: {
      getFile: (indexObjects: any, reply: FastifyReply) => FastifyReply;
      getSync: (index: string, indexObjects: any, reply: FastifyReply) => Promise<FastifyReply>;
      getUnixTimestamp: (date: Date) => number;
    };
  }
}

export {};
