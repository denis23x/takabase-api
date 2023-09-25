/** @format */

import { hash } from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '../client';

/** TS Issue */

declare const process: {
  env: {
    APP_STORAGE: 'disk' | 'bucket';
    APP_ORIGIN: string;
    GCS_ORIGIN: string;
    GCS_BUCKET: string;
  };
};

export const userRaw = async (): Promise<any> => {
  // @ts-ignore
  const prisma: PrismaClient<any> = new PrismaClient();

  /**
   * USER ENTITY
   * Create RAW user data
   */

  // prettier-ignore
  const avatarPathBucket: string[] = ['https://firebasestorage.googleapis.com/v0/b/draft-ssr.appspot.com/o/upload%2Fseed%2F'];
  const avatarPathDisk: string[] = [process.env.APP_ORIGIN, 'images', 'seed'];

  const avatarPathMap: any = {
    bucket: avatarPathBucket,
    disk: avatarPathDisk
  };

  const avatarPath: string = avatarPathMap[process.env.APP_STORAGE].join('');
  const avatarFile = (): string => {
    return [avatarPath, faker.number.int({ min: 1, max: 128 }) + '.webp?alt=media'].join('');
  };

  const raw: any[] = [
    {
      name: 'moderator',
      email: 'moder@moder.com',
      emailConfirmed: false,
      description: 'The moderator',
      avatar: null,
      password: await hash('moder@moder.com', 10)
    }
  ];

  for (let i: number = 0; i < 19; i++) {
    const email: string = faker.internet.email().toLowerCase();

    raw.push({
      name: faker.internet.userName(),
      email,
      emailConfirmed: false,
      description: faker.datatype.boolean() ? faker.person.jobTitle() : null,
      avatar: faker.datatype.boolean() ? avatarFile() : null,
      password: await hash(email, 10)
    });
  }

  return raw;
};
