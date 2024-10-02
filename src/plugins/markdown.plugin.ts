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
      // prettier-ignore
      const imageListFirebase: string[] = imageListUrl.filter((imageUrl: string) => new RegExp(partsImageSchema.pattern).test(imageUrl));
      const imageListRelative: string[] = fastifyInstance.helperPlugin.getRelativeUrl(imageListFirebase);

      // Remove SEO context things and left only Uid

      return imageListRelative.map((markdownImageUrl: string) => {
        const filename: string = markdownImageUrl.split('/').pop();
        const filenameUid: string = filename.split('-').pop();

        return markdownImageUrl.replace(filename, filenameUid);
      });
    },
    getImageListReplace: (markdown: string, previousList: string[], nextList: string[]): string => {
      let markdownNext: string = markdown;

      // Replacing text while preserving SEO context

      for (let i: number = 0; i < previousList.length; i++) {
        const previousPathUrl: URL = new URL(previousList[i]);
        const previousPathUrlPathname: string[] = previousPathUrl.pathname.split('/').filter((path: string) => !!path);
        const previousPath: string = previousPathUrlPathname.join('/');

        const nextPathUrlPathname: string[] = nextList[i].split('/').filter((path: string) => !!path);
        const nextPath: string = [nextPathUrlPathname.shift(), ...previousPathUrlPathname.slice(1)].join('/');

        markdownNext = markdownNext.replace(previousPathUrl.href, previousPathUrl.href.replace(previousPath, nextPath));
      }

      return markdownNext;
    }
  });
});

export default markdownPlugin;
