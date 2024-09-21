/** @format */

import type { Prisma } from '../../../database/client';

// prettier-ignore
export interface PostCreateDto {
  Body: Prisma.PostCreateInput & Prisma.PostPasswordCreateInput & Prisma.PostPrivateCreateInput & Record<string, number | string>;
}
