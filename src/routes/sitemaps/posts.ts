/** @format */

import xmlbuilder from 'xmlbuilder';
import { sitemapConfig } from '../../config/sitemap.config';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Post } from '../../database/client';
import type { XMLElement } from 'xmlbuilder';
import type { SitemapGetDto } from '../../types/dto/sitemap/sitemap-get';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'posts',
    schema: {
      tags: ['Sitemaps'],
      description: 'Get Post related sitemap',
      querystring: {
        type: 'object',
        properties: {
          download: {
            $ref: 'partsSitemapDownloadSchema#'
          }
        }
      },
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
    handler: async function (request: FastifyRequest<SitemapGetDto>, reply: FastifyReply): Promise<any> {
      // Extract information from the request query
      const download: boolean = request.query.download;

      const postList: Partial<Post>[] = await request.server.prisma.post.findMany({
        select: {
          id: true,
          name: true,
          cover: true,
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

        if (post.cover) {
          const imageElement: XMLElement = urlElement.ele('image:image');

          imageElement.ele('image:loc', post.cover);
          imageElement.ele('image:title', post.name);
        }
      });

      const xml: string = sitemap.end({
        pretty: true
      });

      return reply
        .header('Content-Disposition', download ? 'attachment; filename=sitemap-post.xml' : 'inline')
        .type('application/xml')
        .status(200)
        .send(xml);
    }
  });
}
