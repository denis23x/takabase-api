/** @format */

import { PrismaClient, Category } from '../client';
import { faker } from '@faker-js/faker';
import { config } from 'dotenv';

config({
  path: '.env.takabase-local',
  override: false
});

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
    const imageStorage: string = String(process.env.APP_STORAGE);
    const imagePath: string = [imageStorage, 'o/seed'].join('/');
    const imageFile: string = faker.number.int({ min: 1, max: 32 }) + '.webp';

    return [imagePath, imageFile].join('%2F');
  };

  const raw: any[] = [];

  for (let i: number = 0; i < categoriesDB.length * 5; i++) {
    const categoryIndex: number = faker.number.int({ min: 0, max: categoriesDB.length - 1 });
    const category: Category = categoriesDB[categoryIndex];

    raw.push({
      firebaseUid: ['seed', i].join('-'),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      markdown: faker.lorem.paragraphs(10),
      image: faker.datatype.boolean() ? getImagePath() : null,
      userFirebaseUid: category.userFirebaseUid,
      categoryId: category.id
    });
  }

  return raw;
};
