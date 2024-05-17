/** @format */

export const partsSearchScopeSchema: Record<string, any> = {
  $id: 'partsSearchScopeSchema',
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
