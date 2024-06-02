/** @format */

export const postSchema: Record<string, any> = {
  $id: 'postSchema',
  type: 'object',
  properties: {
    id: {
      $ref: 'partsIdSchema#'
    },
    firebaseUid: {
      $ref: 'partsFirebaseUidSchema#'
    },
    name: {
      $ref: 'partsPostNameSchema#'
    },
    description: {
      $ref: 'partsPostDescriptionSchema#'
    },
    markdown: {
      $ref: 'partsPostMarkdownSchema#'
    },
    image: {
      allOf: [
        {
          $ref: 'partsFirebaseUrlStorageSchema#'
        },
        {
          nullable: true
        }
      ]
    },
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
      format: 'date-time'
    }
  }
};
