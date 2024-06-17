/** @format */

export const partsPageSizeSchema: Record<string, any> = {
  $id: 'partsPageSizeSchema',
  type: 'number',
  default: 10,
  minimum: 10,
  maximum: 100
};
