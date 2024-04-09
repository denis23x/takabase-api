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

  fastifyInstance.decorate('storagePlugin', {
    setImageListMove: async (imageList: string[] = [], moveDestination: string): Promise<string[]> => {
      const listMoveTo: Promise<string>[] = imageList.map(async (imageUrl: string) => {
        const source: string = decodeURIComponent(imageUrl);
        const parsedPath: ParsedPath = parse(source);
        const destination: string = decodeURIComponent([moveDestination, parsedPath.base].join('/'));

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
    getImageList: async (imageListDestination: string): Promise<string[]> => {
      const options: GetFilesOptions = {
        prefix: decodeURIComponent(imageListDestination)
      };

      return fastifyInstance.storage
        .getFiles(options)
        .then((getFilesResponse: GetFilesResponse) => getFilesResponse.flat().map((file: any) => file.name));
    }
  });
});

export default storagePlugin;
