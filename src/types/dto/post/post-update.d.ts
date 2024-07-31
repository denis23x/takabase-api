/** @format */

import type { ParamsId } from '../../crud/params/params-id';
import type { Prisma } from '../../../database/client';

export interface PostUpdateDto extends ParamsId {
  // prettier-ignore
  Body: Prisma.PostUpdateInput & Prisma.PostPasswordUpdateInput & Prisma.PostPrivateUpdateInput & Record<string, number | string>;
}
