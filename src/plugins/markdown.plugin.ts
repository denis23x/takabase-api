/** @format */

import fp from 'fastify-plugin';
import { partsImageSchema } from '../schema/parts/parts-image.schema';
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
      const imageListFirebase: string[] = fastifyInstance.markdownPlugin.getImageListFirebaseUrl(imageListUrl);
      const imageListRelative: string[] = fastifyInstance.markdownPlugin.getImageListRelativeUrl(imageListFirebase);

      return imageListRelative;
    },
    getImageListFirebaseUrl: (imageListUrl: string[]): string[] => {
      return imageListUrl.filter((imageUrl: string) => new RegExp(partsImageSchema.pattern).test(imageUrl));
    },
    getImageListRelativeUrl: (imageListUrl: string[]): string[] => {
      return imageListUrl
        .map((imageUrl: string) => new URL(imageUrl))
        .map((url: URL) => (url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname));
    },
    getImageListReplace: (markdown: string, previousList: string[], nextList: string[]): string => {
      let markdownNext: string = markdown;

      for (let i: number = 0; i < previousList.length; i++) {
        const previousPath: string = previousList[i];
        const nextPath: string = nextList[i];

        markdownNext = markdownNext.replace(previousPath, nextPath);
      }

      return markdownNext;
    }
  });
});

export default markdownPlugin;
