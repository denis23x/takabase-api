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
    apiKey: '0b5c73d2b1d45cfb677227ddca285533'
  },
  development: {
    appId: 'SOTX1SV4EX',
    apiKey: '861d86b5757fdf5550cad894e29da38c'
  },
  production: {
    appId: 'HOGBJRS60N',
    apiKey: '250899caaaef577de962111bfe98b23a'
  }
};

export const algoliaConfig: SearchClientOptions = algoliaConfigList[String(process.env.APP_NODE_ENV)];
