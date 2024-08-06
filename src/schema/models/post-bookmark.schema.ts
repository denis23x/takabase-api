/** @format */

export const postBookmarkSchema: Record<string, any> = {
  $id: 'postBookmarkSchema',
  type: 'object',
  properties: {
    id: {
      $ref: 'partsIdSchema#'
    },
    postFirebaseUid: {
      $ref: 'partsFirebaseUidSchema#'
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
