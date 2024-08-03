/** @format */

declare module 'fastify' {
  interface FastifyInstance {
    markdownPlugin: {
      getImageListFromBody: (markdown: string) => string[];
      getImageListFromBucket: (markdownImageList: string[]) => string[];
      getImageListSettled: (markdownImageList: string[]) => string[];
      getImageListReplace: (markdown: string, previousList: string[], nextList: string[]) => string;
      getImageListFirebaseUrl: (markdownImageList: string[]) => string[];
      getImageListRelativeUrl: (markdownImageList: string[]) => string[];
    };
  }
}

export {};
