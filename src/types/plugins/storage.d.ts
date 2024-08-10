/** @format */

import type { Storage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

declare module 'fastify' {
  interface FastifyInstance {
    storage: Storage;
    bucket: Bucket;
    storagePlugin: {
      setImageListMove: (imageList: string[] = [], destination: string) => Promise<string[]>;
      getImageList: (imageListDestination: string) => Promise<string[]>;
    };
  }
}

export {};
