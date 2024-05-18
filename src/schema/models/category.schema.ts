/** @format */

export const categorySchema: Record<string, any> = {
  $id: 'categorySchema',
  type: 'object',
  properties: {
    id: {
      $ref: 'partsIdSchema#'
    },
    name: {
      $ref: 'partsCategoryNameSchema#'
    },
    description: {
      $ref: 'partsCategoryDescriptionSchema#'
    },
    user: {
      $ref: 'userSchema#'
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
