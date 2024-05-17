/** @format */

export const categorySchema: Record<string, any> = {
  $id: 'categorySchema',
  type: 'object',
  allOf: [
    {
      $ref: 'partsIdSchema#'
    },
    {
      $ref: 'categoryUpsertSchema#'
    },
    {
      properties: {
        user: {
          $ref: 'userSchema#'
        },
        posts: {
          type: 'array',
          items: {
            $ref: 'postSchema#'
          }
        },
        createdAt: {
          type: 'string',
          format: 'date-time'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time'
        },
        deletedAt: {
          type: 'string',
          nullable: true,
          format: 'date-time'
        }
      }
    }
  ]
};
