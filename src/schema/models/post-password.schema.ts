/** @format */

export const postPasswordSchema: Record<string, any> = {
  $id: 'postPasswordSchema',
  type: 'object',
  nullable: true,
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
    cover: {
      $ref: 'partsImageSchema#'
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
