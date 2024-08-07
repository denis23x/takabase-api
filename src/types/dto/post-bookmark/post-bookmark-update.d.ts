/** @format */

import type { Prisma } from '../../../database/client';

export interface PostBookmarkUpdateDto {
  Body: Prisma.PostBookmarkUpdateInput & Record<string, string>;
}
