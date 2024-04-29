/** @format */

import type { Prisma } from '../../../database/client';

export interface UserCreateDto {
  Body: Prisma.UserCreateInput & Record<string, any>;
}
