/** @format */

import type { Prisma } from '../../../database/client';

export interface PostPasswordCreateDto {
  Body: Prisma.PostPasswordCreateInput & Record<string, number>;
}
