/** @format */

import type { Prisma } from '../../../database/client';

export interface PostCreateDto {
  Body: Prisma.PostCreateInput & Record<string, number>;
}
