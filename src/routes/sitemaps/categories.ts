/** @format */

import xmlbuilder from 'xmlbuilder';
import { sitemapConfig } from '../../config/sitemap.config';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Category } from '../../database/client';
import type { XMLElement } from 'xmlbuilder';
import type { SitemapGetDto } from '../../types/dto/sitemap/sitemap-get';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'categories',
    schema: {
      tags: ['Sitemaps'],
      description: 'Get Category related sitemap',
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

      const categoryList: Partial<Category>[] = await request.server.prisma.category.findMany({
        select: {
          id: true,
          updatedAt: true,
          user: {
            select: {
              name: true
            }
          }
        }
      });

      const sitemap: XMLElement = xmlbuilder
        .create('urlset', { encoding: 'UTF-8' })
        .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

      categoryList.forEach((category: Partial<Category>) => {
        const urlElement: XMLElement = sitemap.ele('url');

        // @ts-ignore
        const loc: string = [sitemapConfig.origin, category.user.name, 'category', category.id].join('/');
        const lastmod: string = category.updatedAt.toISOString();
        const priority: string = request.server.sitemapPlugin.getPriority(loc, category.updatedAt);
        const changefreq: string = request.server.sitemapPlugin.getChangeFreq(category.updatedAt);

        urlElement.ele('loc', loc);
        urlElement.ele('lastmod', lastmod);
        urlElement.ele('priority', priority);
        urlElement.ele('changefreq', changefreq);
      });

      const xml: string = sitemap.end({
        pretty: true
      });

      return reply
        .header('Content-Disposition', download ? 'attachment; filename=sitemap-category.xml' : 'inline')
        .type('application/xml')
        .status(200)
        .send(xml);
    }
  });
}
