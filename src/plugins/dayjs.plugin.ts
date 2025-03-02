/** @format */

import fp from 'fastify-plugin';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import minMax from 'dayjs/plugin/minMax';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { Dayjs } from 'dayjs';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { ManipulateType } from 'dayjs/esm';

dayjs.extend(utc);
dayjs.extend(minMax);
dayjs.extend(relativeTime);

const DayjsPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('dayjs', (...args) => dayjs(...args));

  fastifyInstance.decorate('dayjsPlugin', {
    getRange: (dateStart: Dayjs, dateEnd: Dayjs, unit: ManipulateType): Dayjs[] => {
      const dateRange: Dayjs[] = [];

      let dateCurrent: Dayjs = dateStart;

      while (!dateCurrent.isAfter(dateEnd)) {
        dateRange.push(dateCurrent);
        dateCurrent = dateCurrent.add(1, unit).utc();
      }

      return dateRange;
    },
    getUnixTimestamp: (date: Date): number => {
      return Math.floor(date.getTime() / 1000);
    }
  });
});

export default DayjsPlugin;
