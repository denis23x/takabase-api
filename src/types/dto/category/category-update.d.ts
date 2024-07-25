/** @format */

import type { ParamsId } from '../../crud/params/params-id';
import type { Prisma } from '../../../database/client';

export interface CategoryUpdateDto extends ParamsId {
  Body: Prisma.CategoryUpdateInput;
}
