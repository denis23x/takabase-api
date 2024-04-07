/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { storageConfig } from '../config/storage.config';

const markdownPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('markdownPlugin', {
    getImageList: (markdown: string): string[] => {
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
    getImageListFirebaseBucket: (imageListUrl: string[]): string[] => {
      return imageListUrl
        .filter((imageUrl: string) => imageUrl.startsWith('https://firebasestorage.googleapis.com'))
        .filter((imageUrl: string) => imageUrl.includes(storageConfig.bucket));
    },
    getImageListTemp: (imageListUrl: string[]): string[] => {
      const imageListTemp: string[] = fastifyInstance.markdownPlugin
        .getImageListFirebaseBucket(imageListUrl)
        .filter((imageUrl: string) => imageUrl.includes('temp'));

      return fastifyInstance.markdownPlugin.getImageListRelativeUrl(imageListTemp);
    },
    getImageListPost: (imageListUrl: string[]): string[] => {
      const imageListPost: string[] = fastifyInstance.markdownPlugin
        .getImageListFirebaseBucket(imageListUrl)
        .filter((imageUrl: string) => imageUrl.includes('users'))
        .filter((imageUrl: string) => imageUrl.includes('posts'));

      return fastifyInstance.markdownPlugin.getImageListRelativeUrl(imageListPost);
    },
    getImageListRewrite: (markdown: string, tempList: string[], postList: string[]): string => {
      let markdownNew: string = markdown;

      for (let i: number = 0; i < tempList.length; i++) {
        const tempPath: string = tempList[i];
        const postPath: string = postList[i];

        markdownNew = markdownNew.replace(tempPath, postPath);
      }

      return markdownNew;
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
