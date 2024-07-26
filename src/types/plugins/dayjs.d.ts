/** @format */

import type { Dayjs } from 'dayjs';
import type { ManipulateType } from 'dayjs/esm';

declare module 'fastify' {
  interface FastifyInstance {
    dayjs: (...args) => Dayjs;
    dayjsPlugin: {
      getEndOf: (date: Dayjs) => Dayjs;
      getMin: (dateList: Dayjs[]) => Dayjs;
      getRange: (dateStart: Dayjs, dateEnd: Dayjs, unit: ManipulateType) => Dayjs[];
    };
  }
}

export {};
