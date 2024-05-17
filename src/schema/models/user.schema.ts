/** @format */

export const userSchema: Record<string, any> = {
  $id: 'userSchema',
  type: 'object',
  allOf: [
    {
      $ref: 'paramsIdSchema#'
    },
    {
      $ref: 'partsFirebaseUidSchema#'
    },
    {
      $ref: 'partsUserNameSchema#'
    },
    {
      properties: {
        id: {
          type: 'number'
        },
        terms: {
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
