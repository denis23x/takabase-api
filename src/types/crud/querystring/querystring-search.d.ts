/** @format */

export interface QuerystringSearch {
  Querystring: {
    name?: string;
    query?: string;
    username?: string;
    categoryId?: number;
    scope?: string[];
    page: number;
    size: number;
  };
}
