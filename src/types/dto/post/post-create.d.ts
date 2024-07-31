/** @format */

import type { Prisma } from '../../../database/client';

export interface PostCreateDto {
  // prettier-ignore
  Body: Prisma.PostCreateInput & Prisma.PostPasswordCreateInput & Prisma.PostPrivateCreateInput & Record<string, number | string>;
}
