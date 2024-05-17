/** @format */

export const postSchema: Record<string, any> = {
  $id: 'postSchema',
  type: 'object',
  allOf: [
    {
      $ref: 'partsIdSchema#'
    },
    {
      $ref: 'partsFirebaseUidSchema#'
    },
    {
      $ref: 'postUpsertSchema#'
    },
    {
      properties: {
        user: {
          $ref: 'userSchema#'
        },
        category: {
          $ref: 'categorySchema#'
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
