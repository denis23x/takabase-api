/** @format */

export const partsSearchUserNameSchema: Record<string, any> = {
  $id: 'partsSearchUserNameSchema',
  type: 'object',
  properties: {
    userName: {
      type: 'string',
      minLength: 2,
      maxLength: 24,
      pattern: '^(?!@)\\S{2,24}$'
    }
  }
};
