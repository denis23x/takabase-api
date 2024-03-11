/** @format */

import { Bucket } from '@google-cloud/storage';

// prettier-ignore
declare module 'fastify' {
  interface FastifyInstance {
    storage: {
      getBucket: (bucketUrl?: string) => Bucket;
      getBucketImageListTempTransfer: (postFirebaseUid: string, imageListUrl: string[]) => Promise<string[]>
      getBucketImageListPost: (userFirebaseUid: string, postFirebaseUid: string) => Promise<string[]>
      getBucketImageListPostDelete: (userFirebaseUid: string, postFirebaseUid: string) => Promise<string[]>
      getBucketImageListPostUpdate: (userFirebaseUid: string, postFirebaseUid: string, imageListUrl: string[]) => Promise<string[]>
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
