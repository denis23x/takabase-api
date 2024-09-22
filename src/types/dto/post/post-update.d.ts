/** @format */

import type { Prisma } from '../../../database/client';

// prettier-ignore
export interface PostUpdateDto {
  Body: Prisma.PostUpdateInput & Prisma.PostPasswordUpdateInput & Prisma.PostPrivateUpdateInput & Record<string, number | string>;
}
