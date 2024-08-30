/** @format */

import type { Dayjs } from 'dayjs';
import type { ManipulateType } from 'dayjs/esm';

declare module 'fastify' {
  interface FastifyInstance {
    dayjs: (...args) => Dayjs;
    dayjsPlugin: {
      getRange: (dateStart: Dayjs, dateEnd: Dayjs, unit: ManipulateType) => Dayjs[];
      getUnixTimestamp: (date: Date) => number;
    };
  }
}

export {};
