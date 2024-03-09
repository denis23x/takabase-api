/** @format */

import { Bucket, Storage } from '@google-cloud/storage';

// prettier-ignore
declare module 'fastify' {
  interface FastifyInstance {
    storage: Storage;
    storageService: {
      getBucket: (bucketUrl?: string) => Bucket;
      getBucketImageListTempTransfer: (postFirebaseId: string, imageListUrl: string[]) => Promise<string[]>
      getBucketImageListPost: (userFirebaseId: string, postFirebaseId: string) => Promise<string[]>
      getBucketImageListPostDelete: (userFirebaseId: string, postFirebaseId: string) => Promise<string[]>
      getBucketImageListPostUpdate: (userFirebaseId: string, postFirebaseId: string, imageListUrl: string[]) => Promise<string[]>
      getBucketImageListSubstringUrl: (markdownImageList: string[]) => string[]
      getMarkdownImageList: (markdown: string) => string[]
      getMarkdownImageListFirebaseBucket: (markdownImageList: string[]) => string[]
      getMarkdownImageListTemp: (markdownImageList: string[]) => string[]
      getMarkdownImageListPost: (markdownImageList: string[]) => string[]
      getMarkdownImageListRewrite: (markdown: string, tempList: string[], postList: string[]) => string
    };
  }
}

export {};
