/** @format */

import type { Storage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

declare module 'fastify' {
  interface FastifyInstance {
    bucket: Bucket;
    storage: Storage;
    storagePlugin: {
      setImageListMove: (imageList: string[] = [], destination: string) => Promise<string[]>;
      getImageList: (imageListDestination: string) => Promise<string[]>;
    };
  }
}

export {};
