/** @format */

import { config } from 'dotenv';
import type { SearchClientOptions } from '@algolia/client-search';

config({
  path: '.env.takabase-local',
  override: false
});

// https://github.com/algolia/algoliasearch-client-javascript

export const algoliaConfig: SearchClientOptions = {
  appId: String(process.env.API_ALGOLIA_APP_ID),
  apiKey: String(process.env.API_ALGOLIA_API_KEY)
};
