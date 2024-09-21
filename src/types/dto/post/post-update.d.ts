/** @format */

import type { ParamsId } from '../../crud/params/params-id';
import type { Prisma } from '../../../database/client';

// prettier-ignore
export interface PostUpdateDto extends ParamsId {
  Body: Prisma.PostUpdateInput & Prisma.PostPasswordUpdateInput & Prisma.PostPrivateUpdateInput & Record<string, number | string>;
}
