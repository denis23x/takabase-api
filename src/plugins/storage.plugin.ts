/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { MoveResponse, File, GetFilesResponse, GetFilesOptions } from '@google-cloud/storage';
import { storageConfig } from '../config/storage.config';
import { getStorage } from 'firebase-admin/storage';
import { parse, ParsedPath } from 'path';

// prettier-ignore
const storagePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('storage', getStorage().bucket(storageConfig.bucket));

  fastifyInstance.decorate('storageService', {
    setImageListMoveTo: async (imageList: string[] = [], moveTo: string): Promise<string[]> => {
      const listMoveTo: Promise<string>[] = imageList.map(async (imageUrl: string) => {
        const source: string = decodeURIComponent(imageUrl);
        const parsedPath: ParsedPath = parse(source);
        const destination: string = decodeURIComponent([moveTo, parsedPath.base].join('/'));

        return fastifyInstance.storage
          .file(source)
          .move(destination)
          .then((moveResponse: MoveResponse) => moveResponse.shift() as File)
          .then((file: File) => String(file.id));
      });

      return Promise.allSettled(listMoveTo).then((promiseSettledResult: PromiseSettledResult<string>[]) => {
        // TODO: Handle rejected ..
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const rejected: PromiseRejectedResult[] = promiseSettledResult.filter((promise: PromiseSettledResult<string>) => promise.status === 'rejected') as PromiseRejectedResult[];
        const fulfilled: PromiseFulfilledResult<string>[] = promiseSettledResult.filter((promise: PromiseSettledResult<string>) => promise.status === 'fulfilled') as PromiseFulfilledResult<string>[];

        return fulfilled.map((promise: PromiseFulfilledResult<string>) => promise.value);
      });
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
      const imageListUrl: string[] = await fastifyInstance.storageService.getImageListPost(userFirebaseUid, postFirebaseUid);
      const imageListUrlDelete: Promise<any>[] = imageListUrl.map(async (imageUrl: string) => {
        return fastifyInstance.storage.file(imageUrl).delete();
      });

      /** Literally delete all files by given address */

      return Promise.allSettled(imageListUrlDelete).then(() => imageListUrl);
    }
  });
});

export default storagePlugin;
