/** @format */

import { ParamsId } from '../../crud/params/params-id';
import type { Prisma } from '../../../database/client';

export interface PostPasswordUpdateDto extends ParamsId {
  Body: Prisma.PostPasswordUpdateInput & Record<string, number | string>;
}
