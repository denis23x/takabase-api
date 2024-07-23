/** @format */

export const postPrivateSchema: Record<string, any> = {
  $id: 'postPrivateSchema',
  allOf: [
    {
      $ref: 'postSchema#'
    }
  ],
  properties: {
    category: false
  }
};
