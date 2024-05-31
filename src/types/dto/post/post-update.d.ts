/** @format */

import { ParamsId } from '../../crud/params/params-id';
import type { Prisma } from '../../../database/client';

export interface PostUpdateDto extends ParamsId {
  Body: Prisma.PostUpdateInput & Record<string, number | string>;
}
