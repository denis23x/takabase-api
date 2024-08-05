/** @format */

declare module 'fastify' {
  interface FastifyInstance {
    sitemapPlugin: {
      getPriority: (url: string, lastmod: Date) => string;
      getChangeFreq: (lastmod: Date) => string;
    };
  }
}

export {};
