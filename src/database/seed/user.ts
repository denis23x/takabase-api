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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const prisma: PrismaClient<any> = new PrismaClient();

  /**
   * USER ENTITY
   * Create RAW user data
   */

  // prettier-ignore
  const avatarPathBucket: string[] = ['https://firebasestorage.googleapis.com/v0/b/draft-ssr.appspot.com/o/upload', 'seed'];
  const avatarPathDisk: string[] = ['http://0.0.0.0:4400', 'upload', 'images', 'seed'];

  const avatarPathMap = (appStorage: string): any => {
    const imageFile: string = faker.number.int({ min: 1, max: 128 }) + '.webp?alt=media';
    const imageMap: any = {
      bucket: [...avatarPathBucket, imageFile].join('%2F'),
      disk: [...avatarPathDisk, imageFile].join('/')
    };

    return imageMap[appStorage];
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
      avatar: faker.datatype.boolean() ? avatarPathMap(process.env.APP_STORAGE) : null,
      password: await hash(email, 10)
    });
  }

  return raw;
};
