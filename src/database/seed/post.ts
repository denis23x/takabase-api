/** @format */

import { PrismaClient, Category } from '../client';
import { faker } from '@faker-js/faker';
import { config } from 'dotenv';
import { storageConfig } from '../../config/storage.config';

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

  const getCoverPath = (): string => {
    return [storageConfig.origin, 'seed', faker.number.int({ min: 1, max: 32 })].join('/') + '.webp';
  };

  const raw: any[] = [];

  for (let i: number = 0; i < categoriesDB.length * 5; i++) {
    const categoryIndex: number = faker.number.int({ min: 0, max: categoriesDB.length - 1 });
    const category: Category = categoriesDB[categoryIndex];

    raw.push({
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      markdown: faker.lorem.paragraphs(10),
      cover: faker.datatype.boolean() ? getCoverPath() : null,
      userFirebaseUid: category.userFirebaseUid,
      categoryId: category.id
    });
  }

  return raw;
};
