/** @format */

import { Bucket } from '@google-cloud/storage';

declare module 'fastify' {
  interface FastifyInstance {
    storage: Bucket;
    storagePlugin: {
      setImageListMoveTo: (imageList: string[] = [], moveTo: string) => Promise<string[]>;
      getImageList: (imageListDestination: string) => Promise<string[]>;
    };
  }
}

export {};
