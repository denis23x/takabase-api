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
      $ref: 'partsUserNameSchema#'
    },
    description: {
      $ref: 'partsUserDescriptionSchema#'
    },
    avatar: {
      $ref: 'partsFirebaseUrlStorageSchema#'
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
      nullable: true,
      format: 'date-time'
    }
  }
};
