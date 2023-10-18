/** @format */

import { faker } from '@faker-js/faker';
import { PrismaClient } from '../client';
import * as dotenv from 'dotenv';

dotenv.config();

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
      description: 'The moderator',
      firebaseId: 'seed-moderator',
      avatar: null,
      terms: true
    }
  ];

  for (let i: number = 0; i < 19; i++) {
    raw.push({
      name: faker.internet.userName(),
      description: faker.datatype.boolean() ? faker.person.jobTitle() : null,
      firebaseId: ['seed', i].join('-'),
      avatar: faker.datatype.boolean() ? avatarPathMap(String(process.env.APP_STORAGE)) : null,
      terms: true
    });
  }

  return raw;
};
