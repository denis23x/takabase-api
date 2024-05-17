/** @format */

export const querystringSearchCategorySchema: Record<string, any> = {
  $id: 'querystringSearchCategorySchema',
  type: 'object',
  allOf: [
    {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          minimum: 1
        }
      }
    },
    {
      $ref: 'partsUserNameSchema#'
    }
  ]
};
