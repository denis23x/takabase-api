/** @format */

import type { ManipulateType } from 'dayjs/esm';

export interface InsightGetDto {
  Querystring: {
    value: number;
    unit: ManipulateType;
  };
}
