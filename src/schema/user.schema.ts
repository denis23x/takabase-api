/** @format */

export const userSchema: Record<string, any> = {
  $id: 'userSchema',
  type: 'object',
  properties: {
    id: {
      type: 'number'
    },
    firebaseUid: {
      type: 'string'
    },
    name: {
      type: 'string'
    },
    description: {
      type: 'string',
      nullable: true
    },
    avatar: {
      type: 'string',
      nullable: true
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
};
