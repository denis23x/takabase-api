/** @format */

import type { ParamsUid } from '../../crud/params/params-uid';
import type { Prisma } from '../../../database/client';

export interface UserUpdateDto extends ParamsUid {
  Body: Prisma.UserUpdateInput;
}
