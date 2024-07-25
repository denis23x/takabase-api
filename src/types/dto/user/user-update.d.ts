/** @format */

import type { ParamsId } from '../../crud/params/params-id';
import type { Prisma } from '../../../database/client';

export interface UserUpdateDto extends ParamsId {
  Body: Prisma.UserUpdateInput;
}
