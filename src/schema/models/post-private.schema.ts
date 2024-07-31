/** @format */

export const postPrivateSchema: Record<string, any> = {
  $id: 'postPrivateSchema',
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
