/** @format */

export const postPasswordSchema: Record<string, any> = {
  $id: 'postPasswordSchema',
  allOf: [
    {
      $ref: 'postSchema#'
    }
  ],
  properties: {
    category: false
  }
};
