/** @format */

export interface QuerystringSearch {
  Querystring: {
    name?: string;
    query?: string;
    userName?: string;
    categoryId?: number;
    scope?: string[];
    page: number;
    size: number;
  };
}
