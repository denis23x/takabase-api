/** @format */

import type { Prisma } from '../../../database/client';

export interface PostPrivateCreateDto {
  Body: Prisma.PostPrivateCreateInput & Record<string, number>;
}
