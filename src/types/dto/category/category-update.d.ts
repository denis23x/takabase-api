/** @format */

import { Id } from '../../requests';
import type { Prisma } from '../../../database/client';

export interface CategoryUpdateDto extends Id {
  Body: Prisma.CategoryUpdateInput;
}
