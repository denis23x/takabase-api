/** @format */

import type { ManipulateType } from 'dayjs/esm';

export interface InsightCreateDto {
  Body: {
    value: number;
    unit: ManipulateType;
  };
}
