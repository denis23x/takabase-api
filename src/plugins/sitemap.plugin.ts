/** @format */

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const SitemapPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('sitemapPlugin', {
    getPriority: (url: string, lastmod: Date): string => {
      // Default priority
      let priority: number = 0.5;

      // Increase priority for top-level pages
      const depth: number = url.split('/').length - 3; // Subtracting base URL parts (e.g., "https://example.com")

      priority -= depth * 0.1;

      // Increase priority for recently updated pages
      const currentDate: Date = new Date();
      const timeDiff: number = currentDate.getTime() - lastmod.getTime();
      const daysDiff: number = timeDiff / (1000 * 3600 * 24);

      if (daysDiff < 30) {
        // Recently updated within the last month
        priority += 0.2;
      } else {
        if (daysDiff < 90) {
          // Updated within the last three months
          priority += 0.1;
        }
      }

      // Ensure priority is within the range [0.0, 1.0]
      return Math.max(0.0, Math.min(1.0, priority)).toFixed(2);
    },
    getChangeFreq: (lastmod: Date): string => {
      const currentDate: Date = new Date();
      const timeDiff: number = currentDate.getTime() - lastmod.getTime();
      const daysDiff: number = timeDiff / (1000 * 3600 * 24);

      if (daysDiff < 1) {
        return 'hourly';
      } else if (daysDiff < 7) {
        return 'daily';
      } else if (daysDiff < 30) {
        return 'weekly';
      } else if (daysDiff < 365) {
        return 'monthly';
      } else {
        return 'yearly';
      }
    }
  });
});

export default SitemapPlugin;
