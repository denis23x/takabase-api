/** @format */

import { Id } from '../../requests';
import type { Prisma } from '../../../database/client';

export interface PostUpdateDto extends Id {
  Body: Prisma.PostUpdateInput;
}
