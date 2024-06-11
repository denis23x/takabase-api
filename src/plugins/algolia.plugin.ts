/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { algoliaConfig } from '../config/algolia.config';
import algoliasearch from 'algoliasearch';

const AlgoliaPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('algolia', algoliasearch(algoliaConfig.appId, algoliaConfig.apiKey));
});

export default AlgoliaPlugin;
