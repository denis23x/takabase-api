/** @format */

export const postSchema: Record<string, any> = {
  $id: 'postSchema',
  type: 'object',
  properties: {
    id: {
      type: 'number'
    },
    name: {
      type: 'string'
    },
    firebaseId: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    markdown: {
      type: 'string'
    },
    image: {
      type: 'string',
      nullable: true
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
      nullable: true,
      format: 'date-time'
    }
  }
};
