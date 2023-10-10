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
    firebaseId: string;
  };
};

// CATEGORY

export interface ID {
  Params: {
    id: number;
  };
}

export interface POSTCategory {
  Body: Prisma.CategoryCreateInput;
}

export interface PUTCategory extends ID {
  Body: Prisma.CategoryUpdateInput;
}

export interface DELETECategory extends ID {}

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
