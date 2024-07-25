/** @format */

import type { ParamsId } from '../../crud/params/params-id';

export interface CategoryDeleteDto extends ParamsId {
  Querystring: {
    categoryId: string;
  };
}
