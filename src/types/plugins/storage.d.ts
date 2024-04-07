/** @format */

import { Bucket } from '@google-cloud/storage';

declare module 'fastify' {
  interface FastifyInstance {
    storage: Bucket;
    storagePlugin: {
      setImageListMove: (imageList: string[] = [], destination: string) => Promise<string[]>;
      getImageList: (imageListDestination: string) => Promise<string[]>;
    };
  }
}

export {};
