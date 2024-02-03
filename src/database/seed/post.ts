/** @format */

import { PrismaClient, Category } from '../client';
import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';

dotenv.config();

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
  const getImagePath = (): any => {
    const imagePathBucket: string[] = ['https://firebasestorage.googleapis.com/v0/b/draft-ssr.appspot.com/o/upload', 'seed'];
    const imageFile: string = faker.number.int({ min: 1, max: 32 }) + '.webp?alt=media';

    return [...imagePathBucket, imageFile].join('%2F');
  };

  const raw: any[] = [];

  for (let i: number = 0; i < categoriesDB.length * 10; i++) {
    const categoryIndex: number = faker.number.int({ min: 0, max: categoriesDB.length - 1 });
    const category: Category = categoriesDB[categoryIndex];

    raw.push({
      name: faker.music.songName(),
      description: faker.lorem.sentence(),
      markdown: faker.lorem.paragraphs(10),
      image: faker.datatype.boolean() ? getImagePath() : null,
      userId: category.userId,
      categoryId: category.id
    });
  }

  return raw;
};
