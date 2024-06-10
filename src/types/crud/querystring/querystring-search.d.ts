/** @format */

export interface QuerystringSearch {
  Querystring: {
    name?: string;
    search?: string;
    userFirebaseUid?: string;
    userName?: string;
    categoryId?: number;
    orderBy?: string;
    scope?: string[];
    page: number;
    size: number;
  };
}
