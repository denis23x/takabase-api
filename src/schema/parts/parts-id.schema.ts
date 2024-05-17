/** @format */

export const partsIdSchema: Record<string, any> = {
  $id: 'partsIdSchema',
  type: 'object',
  properties: {
    id: {
      type: 'number',
      minimum: 1
    }
  }
};
