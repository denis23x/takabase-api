/**
 * Some types used mostly to extract data from:
 * - Request parameters
 * - POST body
 * - Query string
 *
 * @format
 */

type CrudAllRequest = {
  Querystring: {
    search?: string;
    userId?: number;
    order?: string;
    scope?: string[];
    page: number;
    size: number;
  };
};

type CrudIdRequest = {
  Params: {
    id: number;
  };
  Querystring: {
    scope?: string[];
  };
};

// type PostCategory = {
//   Body: {
//     name: string;
//   };
// };
//
// type PutCategory = {
//   Body: {
//     name: string;
//   };
//   Params: {
//     id: string;
//   };
// };
//
// type PostProduct = {
//   Body: {
//     name: string;
//     published: boolean;
//     price: number;
//     categoryId: string;
//   };
// };
//
// type PutProduct = {
//   Body: {
//     name: string;
//     published: boolean;
//     price: number;
//     categoryId: string;
//   };
//   Params: {
//     id: string;
//   };
// };
