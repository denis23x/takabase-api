/** @format */

import { faker } from '@faker-js/faker';
import { PrismaClient } from '../client';
import * as dotenv from 'dotenv';

dotenv.config();

export const userRaw = async (): Promise<any> => {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const prisma: PrismaClient<any> = new PrismaClient();

  /**
   * USER ENTITY
   * Create RAW user data
   */

  // prettier-ignore
  const getAvatarPath = (): any => {
    const avatarPath: string = String(process.env.APP_SEED);
    const avatarFile: string = faker.number.int({ min: 1, max: 32 }) + '.webp';

    return [avatarPath, avatarFile].join('%2F');
  };

  const raw: any[] = [];

  for (let i: number = 0; i < 5; i++) {
    raw.push({
      name: faker.internet.userName(),
      description: faker.datatype.boolean() ? faker.person.bio() : null,
      firebaseId: ['seed', i].join('-'),
      avatar: faker.datatype.boolean() ? getAvatarPath() : null,
      terms: true
    });
  }

  return raw;
};
