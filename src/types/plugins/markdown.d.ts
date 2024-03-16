/** @format */

declare module 'fastify' {
  interface FastifyInstance {
    markdownService: {
      getImageList: (markdown: string) => string[];
      getImageListFirebaseBucket: (markdownImageList: string[]) => string[];
      getImageListTemp: (markdownImageList: string[]) => string[];
      getImageListPost: (markdownImageList: string[]) => string[];
      getImageListRewrite: (markdown: string, tempList: string[], postList: string[]) => string;
      getImageListSubstringUrl: (markdownImageList: string[]) => string[];
    };
  }
}

export {};
