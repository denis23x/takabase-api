/** @format */

export const userSchema: Record<string, any> = {
  $id: 'userSchema',
  type: 'object',
  properties: {
    id: {
      $ref: 'partsIdSchema#'
    },
    firebaseUid: {
      $ref: 'partsFirebaseUidSchema#'
    },
    name: {
      $ref: 'partsUsernameSchema#'
    },
    description: {
      allOf: [
        {
          $ref: 'partsUserDescriptionSchema#'
        },
        {
          nullable: true
        }
      ]
    },
    avatar: {
      $ref: 'partsImageSchema#'
    },
    terms: {
      $ref: 'partsUserTermsSchema#'
    },
    categories: {
      type: 'array',
      items: {
        $ref: 'categorySchema#'
      },
      example: []
    },
    posts: {
      type: 'array',
      items: {
        $ref: 'postSchema#'
      },
      example: []
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
      format: 'date-time'
    }
  }
};
