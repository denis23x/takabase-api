/** @format */

import { config } from 'dotenv';

config({
  path: '.env.takabase-local',
  override: false
});

const paths: Record<string, string> = {
  POST_COVERS: 'post-covers',
  POST_IMAGES: 'post-images',
  PASSWORD_COVERS: 'post-password-covers',
  PASSWORD_IMAGES: 'post-password-images',
  PRIVATE_COVERS: 'post-private-covers',
  PRIVATE_IMAGES: 'post-private-images',
  USER_AVATARS: 'user-avatars'
};

// https://cloud.google.com/storage/docs/introduction

const storageConfigList: Record<string, any> = {
  localhost: {
    projectId: 'takabase-local',
    origin: 'http://localhost:4200',
    bucket: 'takabase-local.appspot.com',
    paths
  },
  development: {
    projectId: 'takabase-dev',
    origin: 'https://takabase-dev.web.app',
    bucket: 'takabase-dev.appspot.com',
    paths
  },
  production: {
    projectId: 'takabase-prod',
    origin: 'https://takabase.com',
    bucket: 'takabase-prod.appspot.com',
    paths
  }
};

export const storageConfig: Record<string, any> = storageConfigList[String(process.env.APP_NODE_ENV)];
