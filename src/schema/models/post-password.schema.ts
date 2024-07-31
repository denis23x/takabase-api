/** @format */

export const postPasswordSchema: Record<string, any> = {
  $id: 'postPasswordSchema',
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
      $ref: 'partsFirebaseUrlStorageSchema#'
    },
    password: {
      $ref: 'partsPasswordSchema#'
    },
    user: {
      $ref: 'userSchema#'
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
