/** @format */

import type { ParamsId } from '../../crud/params/params-id';
import type { Prisma } from '../../../database/client';

export interface PostPrivateUpdateDto extends ParamsId {
  Body: Prisma.PostPrivateUpdateInput & Record<string, number | string>;
}
