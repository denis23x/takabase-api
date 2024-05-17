/** @format */

export const partsSearchPaginationSchema: Record<string, any> = {
  $id: 'partsSearchPaginationSchema',
  type: 'object',
  properties: {
    page: {
      type: 'number',
      default: 1,
      minimum: 1
    },
    size: {
      type: 'number',
      default: 10,
      minimum: 10,
      maximum: 100
    }
  },
  required: ['page', 'size']
};
