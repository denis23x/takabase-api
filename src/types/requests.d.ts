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

export type PostCategory = {
  Body: {
    name: string;
    description?: string;
  };
  Headers: {
    userId: number;
  };
};
