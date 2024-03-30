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

      return fastifyInstance.markdownPlugin.getImageListSubstringUrl(imageListTemp);
    },
    getImageListPost: (imageListUrl: string[]): string[] => {
      const imageListPost: string[] = fastifyInstance.markdownPlugin
        .getImageListFirebaseBucket(imageListUrl)
        .filter((imageUrl: string) => imageUrl.includes('users'))
        .filter((imageUrl: string) => imageUrl.includes('posts'));

      return fastifyInstance.markdownPlugin.getImageListSubstringUrl(imageListPost);
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
    getImageListSubstringUrl: (imageListUrl: string[]): string[] => {
      return imageListUrl.map((imageUrl: string) => {
        const url: URL = new URL(imageUrl);
        const pathname: string = url.pathname;
        const index: number = pathname.indexOf('users');

        return pathname.substring(index);
      });
    }
  });
});

export default markdownPlugin;
