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
    description: {
      type: 'string',
      nullable: true
    },
    markdown: {
      type: 'string'
    },
    image: {
      type: 'string',
      nullable: true
    },
    // userId: {
    //   type: 'number'
    // },
    user: {
      $ref: 'userSchema#'
    },
    // categoryId: {
    //   type: 'number'
    // },
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
