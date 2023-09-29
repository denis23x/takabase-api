/** @format */

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

export type POSTCategory = {
  Body: {
    name: string;
    description?: string;
  };
  Headers: {
    userId: number;
  };
};

export type POSTPost = {
  Body: {
    name: string;
    description: string;
    markdown: string;
    image?: string;
    categoryId: number;
  };
  Headers: {
    userId: number;
  };
};

export type POSTUser = {
  Body: {
    name: string;
    email: string;
    terms: boolean;
    facebookId?: string;
    githubId?: string;
    googleId?: string;
  };
};
