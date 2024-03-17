/** @format */

import { Bucket } from '@google-cloud/storage';

// prettier-ignore
declare module 'fastify' {
  interface FastifyInstance {
    storage: Bucket,
    storageService: {
      setImageListMoveTo: (imageList: string[] = [], moveTo: string) => Promise<string[]>,
      getImageListPost: (userFirebaseUid: string, postFirebaseUid: string) => Promise<string[]>
      setImageListPostDelete: (userFirebaseUid: string, postFirebaseUid: string) => Promise<string[]>
    };
  }
}

export {};
