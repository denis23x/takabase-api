/** @format */

declare module 'fastify' {
  interface FastifyInstance {
    markdownPlugin: {
      getImageList: (markdown: string) => string[];
      getImageListFirebaseBucket: (markdownImageList: string[]) => string[];
      getImageListTemp: (markdownImageList: string[]) => string[];
      getImageListPost: (markdownImageList: string[]) => string[];
      getImageListRewrite: (markdown: string, tempList: string[], postList: string[]) => string;
      getImageListRelativeUrl: (markdownImageList: string[]) => string[];
    };
  }
}

export {};
