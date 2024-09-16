/** @format */

import { PrismaClient } from './client';
import { userRaw } from './seed/user';
import { categoryRaw } from './seed/category';
import { postRaw } from './seed/post';

/** https://github.com/faker-js/faker */
/** https://www.prisma.io/docs/guides/database/seed-database#integrated-seeding-with-prisma-migrate */

const prisma = new PrismaClient();

const main = async () => {
  const deletePostsBookmark = prisma.postBookmark.deleteMany();
  const deletePostsPassword = prisma.postPassword.deleteMany();
  const deletePostsPrivate = prisma.postPrivate.deleteMany();
  const deletePosts = prisma.post.deleteMany();
  const deleteCategories = prisma.category.deleteMany();
  const deleteUsers = prisma.user.deleteMany();
  const deleteInsights = prisma.insights.deleteMany();

  await prisma.$transaction([
    deletePostsBookmark,
    deletePostsPassword,
    deletePostsPrivate,
    deletePosts,
    deleteCategories,
    deleteUsers,
    deleteInsights
  ]);

  /**
   * INSERT DATABASE
   * Transaction can't be applied because we lean on previous result in relations
   */

  await prisma.user.createMany({
    data: await userRaw(),
    skipDuplicates: true
  });

  await prisma.category.createMany({
    data: await categoryRaw(),
    skipDuplicates: true
  });

  await prisma.post.createMany({
    data: await postRaw(),
    skipDuplicates: true
  });
};

/**
 * RUN SEED
 */

main()
  .catch((error: any) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
