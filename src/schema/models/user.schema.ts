/** @format */

export const userSchema: Record<string, any> = {
  $id: 'userSchema',
  type: 'object',
  allOf: [
    {
      $ref: 'partsIdSchema#'
    },
    {
      $ref: 'partsFirebaseUidSchema#'
    },
    {
      $ref: 'userUpdateSchema#'
    },
    {
      properties: {
        terms: {
          type: 'boolean',
          const: true
        },
        categories: {
          type: 'array',
          items: {
            $ref: 'categorySchema#'
          }
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
