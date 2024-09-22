/** @format */

import { config } from 'dotenv';

config({
  path: '.env.takabase-local',
  override: false
});

// https://cloud.google.com/storage/docs/introduction

const storageConfigList: Record<string, any> = {
  localhost: {
    projectId: 'takabase-local',
    origin: 'http://localhost:4200',
    bucket: 'takabase-local.appspot.com'
  },
  development: {
    projectId: 'takabase-dev',
    origin: 'https://takabase-dev.web.app',
    bucket: 'takabase-dev.appspot.com'
  },
  production: {
    projectId: 'takabase-prod',
    origin: 'https://takabase.com',
    bucket: 'takabase-prod.appspot.com'
  }
};

export const storageConfig: Record<string, any> = storageConfigList[String(process.env.APP_NODE_ENV)];
