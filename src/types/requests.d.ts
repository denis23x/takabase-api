/** @format */

import type { Prisma } from '../database/client';

export type CRUDAllRequest = {
  Querystring: {
    name?: string;
    search?: string;
    userId?: number;
    categoryId?: number;
    order?: string;
    scope?: string[];
    page: number;
    size: number;
  };
};

export type CRUDIdRequest = {
  Params: {
    id: number;
  };
  Querystring: {
    scope?: string[];
  };
};

// AUTH

export type POSTAuthorization = {
  Body: {
    uid: string;
    email: string;
  };
};

// CATEGORY

export type POSTCategory = {
  Headers: {
    userId: number;
  };
  Body: Prisma.CategoryCreateInput;
};

export type PUTCategory = {
  Headers: {
    userId: number;
  };
  Params: {
    id: number;
  };
  Body: Prisma.CategoryUpdateInput;
};

// POST

export type POSTPost = {
  Body: Prisma.PostCreateInput;
  Headers: {
    userId: number;
  };
};

export type PUTPost = {
  Headers: {
    userId: number;
  };
  Params: {
    id: number;
  };
  Body: Prisma.PostUpdateInput;
};

// USER

export type POSTUser = {
  Body: Prisma.UserCreateInput;
};

export type PUTUser = {
  Headers: {
    userId: number;
  };
  Params: {
    id: number;
  };
  Body: Prisma.UserUpdateInput;
};
