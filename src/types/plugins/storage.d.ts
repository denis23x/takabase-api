/** @format */

import { Bucket } from '@google-cloud/storage';

// prettier-ignore
declare module 'fastify' {
  interface FastifyInstance {
    storage: Bucket,
    storageService: {
      setImageListMove: (source: string, destination: string) => Promise<string>,
      setImageListMoveTempToPost: (postFirebaseUid: string, imageListUrl: string[]) => Promise<string[]>
      setImageListMovePostToTemp: (postFirebaseUid: string, imageListUrl: string[]) => Promise<string[]>
      getImageListPost: (userFirebaseUid: string, postFirebaseUid: string) => Promise<string[]>
      setImageListPostDelete: (userFirebaseUid: string, postFirebaseUid: string) => Promise<string[]>
      setImageListPostUpdate: (userFirebaseUid: string, postFirebaseUid: string, imageListUrl: string[]) => Promise<string[]>
    };
  }
}

export {};
