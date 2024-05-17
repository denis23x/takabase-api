/** @format */

export const querystringScopeSchema: Record<string, any> = {
  $id: 'querystringScopeSchema',
  type: 'object',
  properties: {
    scope: {
      type: 'array',
      items: {
        type: 'string'
      },
      default: [],
      collectionFormat: 'multi',
      example: ['user', 'post', 'posts', 'category', 'categories']
    }
  }
};
