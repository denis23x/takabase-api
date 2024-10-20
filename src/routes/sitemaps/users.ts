/** @format */

import xmlbuilder from 'xmlbuilder';
import { sitemapConfig } from '../../config/sitemap.config';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../../database/client';
import type { XMLElement } from 'xmlbuilder';
import type { SitemapGetDto } from '../../types/dto/sitemap/sitemap-get';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: 'users',
    schema: {
      tags: ['Sitemaps'],
      description: 'Get User related sitemap',
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

      const userList: Partial<User>[] = await request.server.prisma.user.findMany({
        select: {
          name: true,
          avatar: true,
          updatedAt: true
        }
      });

      const sitemap: XMLElement = xmlbuilder
        .create('urlset', { encoding: 'UTF-8' })
        .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
        .att('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1');

      userList.forEach((user: Partial<User>) => {
        const urlElement: XMLElement = sitemap.ele('url');

        // @ts-ignore
        const loc: string = [sitemapConfig.origin, user.name].join('/');
        const lastmod: string = user.updatedAt.toISOString();
        const priority: string = request.server.sitemapPlugin.getPriority(loc, user.updatedAt);
        const changefreq: string = request.server.sitemapPlugin.getChangeFreq(user.updatedAt);

        urlElement.ele('loc', loc);
        urlElement.ele('lastmod', lastmod);
        urlElement.ele('priority', priority);
        urlElement.ele('changefreq', changefreq);

        // Image

        if (user.avatar) {
          const imageElement: XMLElement = urlElement.ele('image:image');

          imageElement.ele('image:loc', user.avatar);
          imageElement.ele('image:title', user.name);
        }
      });

      const xml: string = sitemap.end({
        pretty: true
      });

      return reply
        .header('Content-Disposition', download ? 'attachment; filename=sitemap-user.xml' : 'inline')
        .type('application/xml')
        .status(200)
        .send(xml);
    }
  });
}
