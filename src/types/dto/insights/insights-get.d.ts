/** @format */

import type { ManipulateType } from 'dayjs/esm';

export interface InsightsGetDto {
  Querystring: {
    value: number;
    unit: ManipulateType;
  };
}
