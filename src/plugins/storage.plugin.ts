/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Storage, Bucket, MoveResponse, File } from '@google-cloud/storage';
import { storageConfig } from '../config/storage.config';

const storagePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('storage', new Storage({ projectId: storageConfig.projectId }));

  fastifyInstance.decorate('storageService', {
    getBucket: (bucketUrl: string = storageConfig.bucket): Bucket => {
      return fastifyInstance.storage.bucket(bucketUrl);
    },
    getBucketTempTransfer: (postFirebaseId: string, imageListUrl: string[]): Promise<string[]> => {
      const postBucketPath: string = ['posts', postFirebaseId].join('/');

      return Promise.all(
        imageListUrl.map(async (imageUrl: string): Promise<string> => {
          const source: string = decodeURIComponent(imageUrl);
          const destination: string = decodeURIComponent(source.replace('temp', postBucketPath));

          return fastifyInstance.storageService
            .getBucket()
            .file(source)
            .move(destination)
            .then((moveResponse: MoveResponse) => (moveResponse as any[]).shift())
            .then((file: File) => String(file.id));
        })
      );
    },
    getMarkdownTempImageList: (markdown: string): string[] => {
      const markdownImageRegExp: RegExp = /!\[(.*?)]\((.*?)\)/g;
      const markdownImageList: RegExpMatchArray | null = markdown.match(markdownImageRegExp);

      if (markdownImageList?.length) {
        /** Get clean url address */

        const markdownImageListUrl: string[] = markdownImageList
          .map((markdownImageUrl: string) => {
            const markdownImageUrlRegExp: RegExp = /(?<=\().+?(?=\))/i;
            const markdownImageUrlList: RegExpMatchArray | null = markdownImageUrl.match(markdownImageUrlRegExp);

            if (markdownImageUrlList?.length) {
              return markdownImageUrlList.shift() as string;
            } else {
              return '';
            }
          })
          .filter((markdownImageUrl: string) => !!markdownImageUrl);

        /** Filter and take move ready file path  */

        return markdownImageListUrl
          .filter((markdownImageUrl: string) => markdownImageUrl.startsWith('https://firebasestorage.googleapis.com'))
          .filter((markdownImageUrl: string) => markdownImageUrl.includes(storageConfig.bucket))
          .filter((markdownImageUrl: string) => markdownImageUrl.includes('temp'))
          .map((markdownImageUrl: string) => {
            const url: URL = new URL(markdownImageUrl);
            const pathname: string = url.pathname;
            const index: number = pathname.indexOf('users');

            return pathname.substring(index);
          });
      }

      return [];
    },
    getMarkdownTempImageListRewrite: (markdown: string, tempList: string[], postList: string[]): string => {
      let markdownNew: string = markdown;

      for (let i: number = 0; i < tempList.length; i++) {
        const tempPath: string = tempList[i];
        const postPath: string = postList[i];

        markdownNew = markdownNew.replace(tempPath, postPath);
      }

      return markdownNew;
    }
  });
});

export default storagePlugin;
