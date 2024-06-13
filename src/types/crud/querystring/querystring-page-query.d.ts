/** @format */

export interface QuerystringPageQuery {
  Querystring: {
    name?: string;
    query?: string;
    userName?: string;
    categoryId?: number;
    orderBy?: string;
    scope?: string[];
    page: number;
    size: number;
  };
}
