/** @format */

import type { Prisma } from '../../../database/client';

export interface PostBookmarkCreateDto {
  Body: Prisma.PostBookmarkCreateInput & Record<string, string>;
}
