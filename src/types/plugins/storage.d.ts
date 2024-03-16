/** @format */

import { Bucket } from '@google-cloud/storage';

// prettier-ignore
declare module 'fastify' {
  interface FastifyInstance {
    storage: Bucket,
    storageService: {
      setImageListTempMove: (postFirebaseUid: string, imageListUrl: string[]) => Promise<string[]>
      getImageListPost: (userFirebaseUid: string, postFirebaseUid: string) => Promise<string[]>
      setImageListPostDelete: (userFirebaseUid: string, postFirebaseUid: string) => Promise<string[]>
      setImageListPostUpdate: (userFirebaseUid: string, postFirebaseUid: string, imageListUrl: string[]) => Promise<string[]>
    };
  }
}

export {};
