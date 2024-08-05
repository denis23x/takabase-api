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
    url: 'user',
    onRequest: [fastify.verifyIdToken, fastify.verifyAdmin],
    schema: {
      tags: ['Sitemap'],
      description: 'Get User related sitemap',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      querystring: {
        type: 'object',
        properties: {
          environment: {
            $ref: 'partsSitemapSchema#'
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
      const userList: Partial<User>[] = await request.server.prisma.user.findMany({
        select: {
          name: true,
          avatar: true,
          updatedAt: true
        }
      });

      const sitemap: XMLElement = xmlbuilder
        .create('urlset', { encoding: 'UTF-8' })
        .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

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

          imageElement.ele('image:loc', user.avatar + '?alt=media');
          imageElement.ele('image:title', user.name);
        }
      });

      const xml: string = sitemap.end({
        pretty: true
      });

      return reply
        .header('Content-Disposition', 'attachment; filename=sitemap-user.xml')
        .type('application/xml')
        .status(200)
        .send(xml);
    }
  });
}
