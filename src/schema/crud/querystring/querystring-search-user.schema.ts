/** @format */

export const querystringSearchUserSchema: Record<string, any> = {
  $id: 'querystringSearchUserSchema',
  type: 'object',
  allOf: [
    {
      type: 'object',
      properties: {
        categoryId: {
          type: 'number',
          minimum: 1
        },
        postId: {
          type: 'number',
          minimum: 1
        }
      }
    }
  ]
};
