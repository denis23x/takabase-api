/** @format */

export const userSchema: Record<string, any> = {
  $id: 'userSchema',
  type: 'object',
  properties: {
    id: {
      type: 'number'
    },
    googleId: {
      type: 'string',
      nullable: true
    },
    facebookId: {
      type: 'string',
      nullable: true
    },
    githubId: {
      type: 'string',
      nullable: true
    },
    name: {
      type: 'string'
    },
    description: {
      type: 'string',
      nullable: true
    },
    email: {
      type: 'string'
    },
    emailConfirmed: {
      type: 'boolean'
    },
    avatar: {
      type: 'string',
      nullable: true
    },
    password: {
      type: 'string',
      nullable: true
    },
    terms: {
      type: 'boolean',
      nullable: true
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
