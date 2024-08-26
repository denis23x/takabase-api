/** @format */

import xmlbuilder from 'xmlbuilder';
import { sitemapConfig } from '../../config/sitemap.config';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Post } from '../../database/client';
import type { XMLElement } from 'xmlbuilder';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'post',
    onRequest: [fastify.verifyIdToken, fastify.verifyAdmin],
    schema: {
      tags: ['Sitemap'],
      description: 'Get Post related sitemap',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      response: {
        '200': {
          type: 'array'
        },
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<any>, reply: FastifyReply): Promise<any> {
      const postList: Partial<Post>[] = await request.server.prisma.post.findMany({
        select: {
          id: true,
          name: true,
          image: true,
          updatedAt: true
        }
      });

      const sitemap: XMLElement = xmlbuilder
        .create('urlset', { encoding: 'UTF-8' })
        .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        .att('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1');

      postList.forEach((post: Partial<Post>) => {
        const urlElement: XMLElement = sitemap.ele('url');

        // @ts-ignore
        const loc: string = [sitemapConfig.origin, 'post', post.id].join('/');
        const lastmod: string = post.updatedAt.toISOString();
        const priority: string = request.server.sitemapPlugin.getPriority(loc, post.updatedAt);
        const changefreq: string = request.server.sitemapPlugin.getChangeFreq(post.updatedAt);

        urlElement.ele('loc', loc);
        urlElement.ele('lastmod', lastmod);
        urlElement.ele('priority', priority);
        urlElement.ele('changefreq', changefreq);

        // Image

        if (post.image) {
          const imageElement: XMLElement = urlElement.ele('image:image');

          imageElement.ele('image:loc', post.image + '?alt=media');
          imageElement.ele('image:title', post.name);
        }
      });

      const xml: string = sitemap.end({
        pretty: true
      });

      return reply
        .header('Content-Disposition', 'attachment; filename=sitemap-post.xml')
        .type('application/xml')
        .status(200)
        .send(xml);
    }
  });
}
