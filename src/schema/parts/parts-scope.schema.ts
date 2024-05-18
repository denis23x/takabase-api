/** @format */

export const partsScopeSchema: Record<string, any> = {
  $id: 'partsScopeSchema',
  type: 'array',
  items: {
    type: 'string'
  },
  default: [],
  collectionFormat: 'multi'
};
