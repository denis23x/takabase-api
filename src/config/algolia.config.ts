/** @format */

import { SearchClientOptions } from '@algolia/client-search';
import { config } from 'dotenv';

config({
  path: '.env.takabase-local',
  override: false
});

// https://github.com/algolia/algoliasearch-client-javascript

const algoliaConfigList: Record<string, SearchClientOptions> = {
  localhost: {
    appId: '9R4WFD8I42',
    apiKey: '8fefeb46b0e8c8f221343c3d55c7f07b'
  },
  development: {
    appId: 'SOTX1SV4EX',
    apiKey: '3c1ca68cc62bf3a5ac9286ee939402c5'
  },
  production: {
    appId: 'HOGBJRS60N',
    apiKey: '55331aeb9ebe423032247ace53a2f62d'
  }
};

export const algoliaConfig: SearchClientOptions = algoliaConfigList[String(process.env.APP_NODE_ENV)];
