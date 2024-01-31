/** @format */

import { Id } from '../../requests';
import type { Prisma } from '../../../database/client';

export interface UserUpdateDto extends Id {
  Body: Prisma.UserUpdateInput;
}
