/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { MoveResponse, File, GetFilesResponse, GetFilesOptions } from '@google-cloud/storage';
import { storageConfig } from '../config/storage.config';
import { getStorage } from 'firebase-admin/storage';

// prettier-ignore
const storagePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('storage', getStorage().bucket(storageConfig.bucket));

  fastifyInstance.decorate('storageService', {
    setImageListMove: async (source: string, destination: string): Promise<string> => {
      return fastifyInstance.storage
        .file(source)
        .move(destination)
        .then((moveResponse: MoveResponse) => moveResponse.shift() as File)
        .then((file: File) => String(file.id));
    },
    setImageListMoveTempToPost: (postFirebaseUid: string, imageListUrl: string[] = []): Promise<string[]> => {
      const postBucketPath: string = ['posts', postFirebaseUid].join('/');

      return Promise.all(
        imageListUrl.map(async (imageUrl: string): Promise<string> => {
          const source: string = decodeURIComponent(imageUrl);
          const destination: string = decodeURIComponent(source.replace('temp', postBucketPath));

          return fastifyInstance.storageService.setImageListMove(source, destination);
        })
      );
    },
    setImageListMovePostToTemp: (postFirebaseUid: string, imageListUrl: string[] = []): Promise<string[]> => {
      const postBucketPath: string = ['posts', postFirebaseUid].join('/');

      return Promise.all(
        imageListUrl.map(async (imageUrl: string): Promise<string> => {
          const source: string = decodeURIComponent(imageUrl);
          const destination: string = decodeURIComponent(source.replace(postBucketPath, 'temp'));

          return fastifyInstance.storageService.setImageListMove(source, destination);
        })
      );
    },
    getImageListPost: async (userFirebaseUid: string, postFirebaseUid: string): Promise<string[]> => {
      const options: GetFilesOptions = {
        prefix: decodeURIComponent(['users', userFirebaseUid, 'posts', postFirebaseUid].join('/') + '/'),
        delimiter: '/'
      };

      return fastifyInstance.storage
        .getFiles(options)
        .then((getFilesResponse: GetFilesResponse) => getFilesResponse.flat().map((file: any) => file.name));
    },
    setImageListPostDelete: async (userFirebaseUid: string, postFirebaseUid: string): Promise<string[]> => {
      return fastifyInstance.storageService
        .getImageListPost(userFirebaseUid, postFirebaseUid)
        .then(async (imageListUrl: string[]) => {
          await Promise.all(imageListUrl.map((imageUrl: string) => {
            return fastifyInstance.storage.file(imageUrl).delete();
          }));

          return imageListUrl;
        });
    }
  });
});

export default storagePlugin;
