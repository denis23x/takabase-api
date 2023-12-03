/** @format */

import { PrismaClient, User } from '../client';
import { faker } from '@faker-js/faker';

export const categoryRaw = async (): Promise<any> => {
  const prisma: PrismaClient<any> = new PrismaClient();

  /**
   * CATEGORY ENTITY
   * Create RAW category data
   */

  const usersDB: User[] = await prisma.user.findMany();

  const raw: any[] = [];

  for (let i: number = 0; i < usersDB.length * 5; i++) {
    const user: User = usersDB[faker.number.int({ min: 0, max: usersDB.length - 1 })];

    raw.push({
      name: faker.commerce.department(),
      description: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      userId: user.id
    });
  }

  return raw;
};
