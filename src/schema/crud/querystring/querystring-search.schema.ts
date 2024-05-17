/** @format */

export const querystringSearchSchema: Record<string, any> = {
  $id: 'querystringSearchSchema',
  type: 'object',
  properties: {
    query: {
      type: 'string',
      minLength: 2,
      maxLength: 24
    },
    orderBy: {
      type: 'string',
      enum: ['newest', 'oldest']
    },
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
