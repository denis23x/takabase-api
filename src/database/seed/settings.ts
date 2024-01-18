/** @format */

import { PrismaClient, User } from '../client';

export const settingsRaw = async (): Promise<any> => {
  const prisma: PrismaClient<any> = new PrismaClient();

  /**
   * SETTINGS ENTITY
   * Create RAW settings data
   */

  const usersDB: User[] = await prisma.user.findMany();

  const raw: any[] = [];

  for (let i: number = 0; i < usersDB.length; i++) {
    const user: User = usersDB[i];

    raw.push({
      theme: 'auto',
      themePrism: 'default',
      themeBackground: 'slanted-gradient',
      language: 'en-US',
      markdownMonospace: true,
      pageScrollToTop: false,
      pageScrollInfinite: true,
      pageRedirectHome: true,
      windowButtonPosition: 'left',
      userId: user.id
    });
  }

  return raw;
};
