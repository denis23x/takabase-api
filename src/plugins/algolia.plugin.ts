/** @format */

import fp from 'fastify-plugin';
import algoliasearch from 'algoliasearch';
import { algoliaConfig } from '../config/algolia.config';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import type { ChunkedBatchResponse, DeleteResponse } from '@algolia/client-search';
import type { SearchIndex } from 'algoliasearch';
import type { SearchClient } from 'algoliasearch/dist/algoliasearch';

//! Singleton

let searchClient: SearchClient = null;

const algoliaPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  if (!searchClient) {
    searchClient = algoliasearch(algoliaConfig.appId, algoliaConfig.apiKey);
  }

  //!Set instance

  fastifyInstance.decorate('algolia', searchClient);

  fastifyInstance.decorate('algoliaPlugin', {
    getFile: (indexObjects: any, reply: FastifyReply): FastifyReply => {
      const indexObjectsString: string = JSON.stringify(indexObjects);
      const indexObjectsBuffer: Buffer = Buffer.from(indexObjectsString);

      return reply
        .header('Content-Disposition', 'attachment; filename=indexObjects.json')
        .type('application/json')
        .status(200)
        .send(indexObjectsBuffer);
    },
    setClear: async (index: string): Promise<void> => {
      const searchIndex: SearchIndex = fastifyInstance.algolia.initIndex(index);

      searchIndex
        .clearObjects()
        .then(() => console.log(index + ' index was cleared'))
        .catch((error: any) => console.error(error));
    },
    getSync: async (index: string, indexObjects: any, reply: FastifyReply): Promise<FastifyReply> => {
      // @ts-ignore
      const deleteResponse: DeleteResponse = await fastifyInstance.algoliaPlugin.setClear(index);
      const searchIndex: SearchIndex = fastifyInstance.algolia.initIndex(index);
      const chunkedBatchResponse: ChunkedBatchResponse = await searchIndex.saveObjects(indexObjects);

      return reply.status(200).send({
        data: chunkedBatchResponse,
        statusCode: 200
      });
    }
  });
});

export default algoliaPlugin;
