/** @format */

import fp from 'fastify-plugin';
import { storageConfig } from '../config/storage.config';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const markdownPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('markdownPlugin', {
    getImageListFromBody: (markdown: string): string[] => {
      const markdownImageRegExp: RegExp = /!\[(.*?)]\((.*?)\)/g;
      const markdownImageList: RegExpMatchArray | null = markdown.match(markdownImageRegExp);

      if (markdownImageList?.length) {
        return markdownImageList
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
      }

      return [];
    },
    getImageListFromBucket: (imageListUrl: string[]): string[] => {
      // prettier-ignore
      return fastifyInstance.markdownPlugin.getImageListRelativeUrl(fastifyInstance.markdownPlugin.getImageListFirebaseUrl(imageListUrl));
    },
    getImageListSettled: (imageListUrl: string[]): string[] => {
      const imageListPost: string[] = fastifyInstance.markdownPlugin
        .getImageListFirebaseUrl(imageListUrl)
        .filter((imageUrl: string) => {
          return ['users', 'posts', 'posts-password', 'posts-private'].some((imageUrlDestination: string) => {
            return imageUrl.includes(imageUrlDestination);
          });
        });

      return fastifyInstance.markdownPlugin.getImageListRelativeUrl(imageListPost);
    },
    getImageListReplace: (markdown: string, previousList: string[], nextList: string[]): string => {
      let markdownNext: string = markdown;

      for (let i: number = 0; i < previousList.length; i++) {
        const previousPath: string = previousList[i];
        const nextPath: string = nextList[i];

        markdownNext = markdownNext.replace(previousPath, nextPath);
      }

      return markdownNext;
    },
    getImageListFirebaseUrl: (imageListUrl: string[]): string[] => {
      return imageListUrl
        .filter((imageUrl: string) => imageUrl.startsWith('https://firebasestorage.googleapis.com'))
        .filter((imageUrl: string) => imageUrl.includes(storageConfig.bucket));
    },
    getImageListRelativeUrl: (imageListUrl: string[]): string[] => {
      return imageListUrl.map((imageUrl: string) => {
        const url: URL = new URL(imageUrl);
        const pathname: string = url.pathname;

        // Function to determine the index for substring extraction (root storage relative)
        const getIndex = (): number => {
          // Find the index of 'users' in the pathname
          const users: number = pathname.indexOf('users');

          // Find the index of 'temp' in the pathname
          const temp: number = pathname.indexOf('temp');

          // Return the appropriate index based on the presence of 'users' or 'temp'
          switch (true) {
            case users !== -1: {
              return users;
            }
            case temp !== -1: {
              return temp;
            }
            default: {
              return 0;
            }
          }
        };

        // Extract the substring URL based on the determined index
        return pathname.substring(getIndex());
      });
    }
  });
});

export default markdownPlugin;
