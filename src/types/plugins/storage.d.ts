/** @format */

import { Storage, Bucket } from '@google-cloud/storage';

declare module 'fastify' {
  interface FastifyInstance {
    storage: Storage;
    storageService: {
      getBucket: () => Bucket;
      getBucketTempTransfer: (postFirebaseId: string, imageListUrlTempPath: string[]) => Promise<string[]>;
      getMarkdownTempImageList: (markdown: string) => string[];
      getMarkdownTempImageListRewrite: (markdown: string, tempList: string[], postList: string[]) => string;
    };
  }
}

export {};
