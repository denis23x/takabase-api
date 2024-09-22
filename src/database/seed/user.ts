/** @format */

import { faker } from '@faker-js/faker';
import { PrismaClient } from '../client';
import { config } from 'dotenv';
import { storageConfig } from '../../config/storage.config';

config({
  path: '.env.takabase-local',
  override: false
});

export const userRaw = async (): Promise<any> => {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const prisma: PrismaClient<any> = new PrismaClient();

  /**
   * USER ENTITY
   * Create RAW user data
   */

  const getAvatarPath = (): string => {
    return [storageConfig.origin, 'seed', faker.number.int({ min: 1, max: 32 })].join('/') + '.webp';
  };

  const raw: any[] = [];

  for (let i: number = 0; i < 5; i++) {
    // @ts-ignore
    const username: string = faker.animal[faker.animal.type()]().replace(/\s+/g, '-');
    const uid: string = faker.string.alphanumeric(20);

    raw.push({
      name: [username, uid.slice(0, 4)].join('-').toLowerCase(),
      firebaseUid: uid,
      description: faker.datatype.boolean() ? faker.person.bio() : null,
      avatar: faker.datatype.boolean() ? getAvatarPath() : null,
      terms: true
    });
  }

  return raw;
};
