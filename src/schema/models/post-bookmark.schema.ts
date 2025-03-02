/** @format */

export const postBookmarkSchema: Record<string, any> = {
  $id: 'postBookmarkSchema',
  type: 'object',
  nullable: true,
  properties: {
    id: {
      $ref: 'partsIdSchema#'
    },
    postId: {
      $ref: 'partsIdSchema#'
    },
    userFirebaseUid: {
      $ref: 'partsFirebaseUidSchema#'
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
