/** @format */

import type { ManipulateType } from 'dayjs/esm';

export interface InsightsCreateDto {
  Body: {
    value: number;
    unit: ManipulateType;
  };
}
