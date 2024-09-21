/** @format */

import fp from 'fastify-plugin';
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
      // prettier-ignore
      const regExp: RegExp = new RegExp('^https?:\\/\\/[^\\/]+\\/(avatars|covers|images|seed|temp)\\/[a-zA-Z0-9]{2,}\\.webp$');

      return imageListUrl.filter((imageUrl: string) => regExp.test(imageUrl));
    },
    getImageListRelativeUrl: (imageListUrl: string[]): string[] => {
      // prettier-ignore
      const regExp: RegExp = new RegExp('(avatars|covers|images|seed|temp)\\/[^\\?]+');

      return imageListUrl.map((imageUrl: string) => {
        const regExpMatchArray: RegExpMatchArray = decodeURIComponent(imageUrl).match(regExp);

        if (regExpMatchArray) {
          return regExpMatchArray[0];
        }

        return imageUrl;
      });
    },
    //!
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
    }
  });
});

export default markdownPlugin;
