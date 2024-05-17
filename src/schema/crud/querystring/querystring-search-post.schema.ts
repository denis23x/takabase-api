/** @format */

export const querystringSearchPostSchema: Record<string, any> = {
  $id: 'querystringSearchPostSchema',
  type: 'object',
  allOf: [
    {
      type: 'object',
      properties: {
        categoryId: {
          type: 'number',
          minimum: 1
        },
        userId: {
          type: 'number',
          minimum: 1
        }
      }
    },
    {
      $ref: 'querystringSearchUserNameSchema#'
    }
  ]
};
