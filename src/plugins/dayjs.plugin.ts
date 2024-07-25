/** @format */

import fp from 'fastify-plugin';
import dayjs from 'dayjs';
import { Dayjs } from 'dayjs';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { ManipulateType } from 'dayjs/esm';

const DayjsPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('dayjs', (...args) => dayjs(...args));

  fastifyInstance.decorate('dayjsPlugin', {
    getEndOf: (date: Dayjs): Dayjs => date.endOf('day'),
    getRange: (dateStart: Dayjs, dateEnd: Dayjs, unit: ManipulateType): Dayjs[] => {
      const dateRange: Dayjs[] = [];

      let dateCurrent: Dayjs = dateStart;

      while (!dateCurrent.isAfter(dateEnd)) {
        dateRange.push(dateCurrent);

        dateCurrent = dateCurrent.add(1, unit);
      }

      return dateRange;
    }
  });
});

export default DayjsPlugin;
