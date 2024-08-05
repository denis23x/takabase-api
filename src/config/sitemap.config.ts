/** @format */

import { config } from 'dotenv';

config({
  path: '.env.takabase-local',
  override: false
});

const sitemapConfigList: Record<string, any> = {
  localhost: {
    origin: 'http://localhost:4200'
  },
  development: {
    origin: 'https://takabase-dev.web.app'
  },
  production: {
    origin: 'https://takabase.com'
  }
};

export const sitemapConfig: any = sitemapConfigList[String(process.env.APP_NODE_ENV)];
