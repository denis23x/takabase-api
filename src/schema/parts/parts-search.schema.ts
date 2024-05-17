/** @format */

export const partsSearchSchema: Record<string, any> = {
  $id: 'partsSearchSchema',
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
    }
  }
};
