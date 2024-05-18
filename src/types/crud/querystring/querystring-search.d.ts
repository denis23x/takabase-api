/** @format */

export interface QuerystringSearch {
  Querystring: {
    name?: string;
    search?: string;
    userId?: number;
    userName?: string;
    categoryId?: number;
    orderBy?: string;
    scope?: string[];
    page: number;
    size: number;
  };
}
