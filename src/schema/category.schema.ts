/** @format */

export const categorySchema: Record<string, any> = {
  $id: 'categorySchema',
  type: 'object',
  properties: {
    id: {
      type: 'number'
    },
    userId: {
      type: 'number'
    },
    user: {
      $ref: 'userSchema#'
    },
    name: {
      type: 'string'
    },
    description: {
      type: 'string',
      nullable: true
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
