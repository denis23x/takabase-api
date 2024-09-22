/** @format */

export interface QuerystringSearch {
  Querystring: {
    name?: string;
    query?: string;
    username?: string;
    categoryId?: number;
    postIdList?: number[];
    page: number;
    size: number;
  };
}
