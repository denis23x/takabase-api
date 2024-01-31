/** @format */

export type Id = {
  Params: {
    id: number;
  };
};

export interface DeleteRequest extends Id {
  Querystring: {
    categoryId?: number;
  };
}

export interface GetAllRequest {
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
}

export interface GetOneRequest extends Id {
  Querystring: {
    scope?: string[];
  };
}
