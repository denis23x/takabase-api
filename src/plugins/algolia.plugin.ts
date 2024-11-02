/** @format */

import fp from 'fastify-plugin';
import { algoliaConfig } from '../config/algolia.config';
import { algoliasearch } from 'algoliasearch';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import type { BatchResponse, SearchClient } from 'algoliasearch';

//! Singleton

let searchClient: SearchClient = null;

const algoliaPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  if (!searchClient) {
    searchClient = algoliasearch(algoliaConfig.appId, algoliaConfig.apiKey);
  }

  //! Set instance

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
      await fastifyInstance.algolia
        .clearObjects({ indexName: index })
        .then(() => console.log(index + ' index was cleared'))
        .catch((error: any) => console.error(error));
    },
    getSync: async (index: string, indexObjects: any, reply: FastifyReply): Promise<FastifyReply> => {
      const chunkedBatchResponse: BatchResponse[] = await fastifyInstance.algolia.saveObjects({
        indexName: index,
        objects: indexObjects
      });

      return reply.status(200).send({
        data: chunkedBatchResponse,
        statusCode: 200
      });
    }
  });
});

export default algoliaPlugin;
