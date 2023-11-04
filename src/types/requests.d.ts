/** @format */

import type { Prisma } from '../database/client';

// GENERIC

export type Id = {
  Params: {
    id: number;
  };
};

// REQUEST

export type DeleteRequest = {
  Params: {
    id: number;
  };
  Querystring: {
    categoryId?: number;
  };
};

export type GetAllRequest = {
  Querystring: {
    name?: string;
    query?: string;
    userId?: number;
    userName?: string;
    categoryId?: number;
    orderBy?: string;
    scope?: string[];
    page: number;
    size: number;
  };
};

export type GetOneRequest = {
  Params: {
    id: number;
  };
  Querystring: {
    scope?: string[];
  };
};

// AUTH

export type CreateAuthorization = {
  Body: {
    firebaseId: string;
  };
};

// CATEGORY

export interface CreateCategory {
  Body: Prisma.CategoryCreateInput;
}

export interface UpdateCategory extends Id {
  Body: Prisma.CategoryUpdateInput;
}

// POST

export interface CreatePost {
  Body: Prisma.PostCreateInput & Record<string, number>;
}

export interface UpdatePost extends Id {
  Body: Prisma.PostUpdateInput;
}

// USER

export interface CreateUser {
  Body: Prisma.UserCreateInput;
}

export interface UpdateUser extends Id {
  Body: Prisma.UserUpdateInput;
}
