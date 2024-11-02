/** @format */

import { config } from 'dotenv';

config({
  path: '.env.takabase-local',
  override: false
});

// https://github.com/algolia/algoliasearch-client-javascript

export const algoliaConfig: Record<string, string> = {
  appId: String(process.env.API_ALGOLIA_APP_ID),
  apiKey: String(process.env.API_ALGOLIA_API_KEY)
};
