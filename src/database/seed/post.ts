/** @format */

import { PrismaClient, Category } from '../client';
import { faker } from '@faker-js/faker';
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

export const postRaw = async (): Promise<any> => {
  const prisma: PrismaClient<any> = new PrismaClient();

  /**
   * POST ENTITY
   * Create RAW post data
   */

  const categoriesDB: Category[] = await prisma.category.findMany({
    include: {
      user: true
    }
  });

  // prettier-ignore
  const imagePathBucket: string[] = ['https://firebasestorage.googleapis.com/v0/b/draft-ssr.appspot.com/o/upload', 'seed'];
  const imagePathDisk: string[] = ['http://0.0.0.0:4400', 'upload', 'images', 'seed'];

  const imagePathMap = (appStorage: string): any => {
    const imageFile: string = faker.number.int({ min: 1, max: 32 }) + '.webp?alt=media';
    const imageMap: any = {
      bucket: [...imagePathBucket, imageFile].join('%2F'),
      disk: [...imagePathDisk, imageFile].join('/')
    };

    return imageMap[appStorage];
  };

  const raw: any[] = [];

  for (let i: number = 0; i < categoriesDB.length * 10; i++) {
    const categoryIndex: number = faker.number.int({ min: 0, max: categoriesDB.length - 1 });
    const category: Category = categoriesDB[categoryIndex];

    raw.push({
      name: faker.music.songName(),
      description: faker.lorem.sentence(),
      markdown: faker.lorem.paragraphs(10),
      image: faker.datatype.boolean() ? imagePathMap(String(process.env.APP_STORAGE)) : null,
      userId: category.userId,
      categoryId: category.id
    });
  }

  return raw;
};
