/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { algoliaConfig } from '../config/algolia.config';
import { ChunkedBatchResponse } from '@algolia/client-search';
import algoliasearch, { SearchIndex } from 'algoliasearch';

const AlgoliaPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('algolia', algoliasearch(algoliaConfig.appId, algoliaConfig.apiKey));

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
    getSync: async (index: string, indexObjects: any, reply: FastifyReply): Promise<FastifyReply> => {
      const searchIndex: SearchIndex = fastifyInstance.algolia.initIndex(index);

      const chunkedBatchResponse: ChunkedBatchResponse = await searchIndex.saveObjects(indexObjects);

      return reply.status(200).send({
        data: chunkedBatchResponse,
        statusCode: 200
      });
    },
    getUnixTimestamp: (date: Date): number => {
      return Math.floor(date.getTime() / 1000);
    }
  });
});

export default AlgoliaPlugin;
