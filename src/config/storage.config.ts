/** @format */

import * as dotenv from 'dotenv';

dotenv.config();

// https://cloud.google.com/storage/docs/introduction

const storageConfigList: Record<string, any> = {
  localhost: {
    projectId: 'takabase-local',
    bucket: 'takabase-local.appspot.com'
  },
  development: {
    projectId: 'takabase-dev',
    bucket: 'takabase-dev.appspot.com'
  },
  production: {
    projectId: 'takabase-prod',
    bucket: 'takabase-prod.appspot.com'
  }
};

export const storageConfig: Record<string, any> = storageConfigList[String(process.env.NODE_ENV)];
